<script lang="ts">
	import { useRepairs } from '$lib/hooks/repairs.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { REPAIR_STATUS, STATUS_COLORS, STATUS_LABELS } from '$lib/constants';
	import {
		formatCurrency,
		formatDate,
		carLabel,
		formatDateTime,
		formatRelativeTime
	} from '$lib/utils';
	import {
		ChevronRightIcon,
		AlertCircleIcon,
		AlertTriangleIcon,
		CarIcon,
		StoreIcon,
		WrenchIcon,
		SettingsIcon,
		CalendarClockIcon,
		UserIcon,
		SearchIcon,
		XIcon,
		RefreshCwIcon
	} from '@lucide/svelte';
	import PaymentForm from '$lib/components/repairs/payment-form.svelte';
	import QuickStatusButton from '$lib/components/repairs/quick-status-button.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { Shop } from '$lib/types';

	let { shop, isOwner = false }: { shop: Shop | null; isOwner?: boolean } = $props();

	const repairsState = useRepairs();

	let expanded = $state<string | null>(null);
	let query = $state('');

	const matching = $derived.by(() => {
		const search = query.trim().toLowerCase();

		if (!search) {
			return repairsState.repairs;
		}

		return repairsState.repairs.filter((repair) => {
			const label = carLabel(repairsState.cars, repair.carId).toLowerCase();
			const title = repair.title.toLowerCase();
			const desc = repair.description.toLowerCase();
			const status = STATUS_LABELS[repair.status].toLowerCase();
			const mechanic = repair.assignedMechanic
				? (repair.assignedMechanic.name ?? repair.assignedMechanic.email).toLowerCase()
				: '';
			return (
				title.includes(search) ||
				desc.includes(search) ||
				status.includes(search) ||
				label.includes(search) ||
				mechanic.includes(search)
			);
		});
	});

	const pendingEstimates = $derived(
		matching.filter((r) => r.status === REPAIR_STATUS.ESTIMATE_PENDING)
	);

	const activeRepairs = $derived(
		matching.filter(
			(r) => r.status === REPAIR_STATUS.ESTIMATE_APPROVED || r.status === REPAIR_STATUS.IN_PROGRESS
		)
	);

	const awaitingPayment = $derived(matching.filter((r) => r.status === REPAIR_STATUS.COMPLETED));

	const allUnassigned = $derived(
		repairsState.repairs.filter(
			(r) =>
				!r.assignedMechanicId &&
				r.status !== REPAIR_STATUS.COMPLETED &&
				r.status !== REPAIR_STATUS.PAID &&
				r.status !== REPAIR_STATUS.ESTIMATE_REJECTED
		)
	);

	const allToday = $derived.by(() => {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const end = new Date(start.getTime() + 86400000);

		return repairsState.repairs.filter((r) => {
			if (!r.appointmentAt) return false;
			if (r.status === REPAIR_STATUS.COMPLETED || r.status === REPAIR_STATUS.PAID) return false;
			const apt = new Date(r.appointmentAt);
			return apt >= start && apt < end;
		});
	});

	const upcoming = $derived.by(() => {
		const now = Date.now();
		return repairsState.repairs
			.filter((r) => {
				if (!r.appointmentAt) return false;
				if (r.status === REPAIR_STATUS.COMPLETED || r.status === REPAIR_STATUS.PAID) return false;
				return new Date(r.appointmentAt).getTime() >= now;
			})
			.toSorted(
				(a, b) =>
					new Date(a.appointmentAt ?? 0).getTime() - new Date(b.appointmentAt ?? 0).getTime()
			);
	});

	const next = $derived(upcoming[0] ?? null);

	const completedRepairs = $derived(
		matching
			.filter((r) => r.status === REPAIR_STATUS.COMPLETED || r.status === REPAIR_STATUS.PAID)
			.slice(0, 5)
	);

	const overdue = $derived.by(() => {
		const now = Date.now();

		return matching
			.filter((r) => {
				if (!r.appointmentAt) return false;
				if (r.status === REPAIR_STATUS.COMPLETED) return false;
				if (r.status === REPAIR_STATUS.PAID) return false;
				if (r.status === REPAIR_STATUS.ESTIMATE_REJECTED) return false;
				return new Date(r.appointmentAt).getTime() < now;
			})
			.toSorted(
				(a, b) =>
					new Date(a.appointmentAt ?? 0).getTime() - new Date(b.appointmentAt ?? 0).getTime()
			);
	});

	const totalRevenue = $derived(
		repairsState.repairs
			.filter((r) => r.status === REPAIR_STATUS.PAID)
			.reduce((sum, r) => sum + r.totalCost, 0)
	);

	const unpaidRevenue = $derived(
		repairsState.repairs
			.filter((r) => r.status === REPAIR_STATUS.COMPLETED)
			.reduce((sum, r) => sum + (r.totalCost - (r.amountPaid ?? 0)), 0)
	);

	const hasQuery = $derived(query.trim().length > 0);

	function toggle(id: string) {
		expanded = expanded === id ? null : id;
	}

	function clearSearch() {
		query = '';
	}

	async function refresh() {
		await repairsState.loadData();
	}

	function handleWorkflowAction() {
		refresh();
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<h1 class="text-3xl font-bold">{shop?.name ?? 'Shop Dashboard'}</h1>
			<p class="text-muted-foreground">Manage repairs and track your shop's performance</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button variant="outline" onclick={refresh} disabled={repairsState.loading}>
				<RefreshCwIcon class="size-4" />
				Refresh
			</Button>
			<Button variant="outline" onclick={() => goto(resolve('/app/calendar'))}>
				<CalendarClockIcon class="size-4" />
				Calendar
			</Button>
			{#if isOwner}
				<Button variant="outline" onclick={() => goto(resolve('/app/shop/settings'))}>
					<SettingsIcon class="size-4" />
					Settings
				</Button>
			{/if}
		</div>
	</div>

	<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<div class="relative w-full lg:max-w-md">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				bind:value={query}
				class="h-10 pr-9 pl-9"
				placeholder="Search by vehicle, mechanic, status, or repair"
			/>
			{#if hasQuery}
				<Button
					type="button"
					variant="ghost"
					size="icon"
					class="absolute top-1/2 right-1 size-7 -translate-y-1/2"
					onclick={clearSearch}
				>
					<XIcon class="size-4" />
				</Button>
			{/if}
		</div>
		{#if next}
			<p class="text-sm text-muted-foreground">
				Next appointment: <span class="font-medium text-foreground"
					>{formatDateTime(next.appointmentAt)}</span
				>
				<span class="ml-1">({formatRelativeTime(next.appointmentAt)})</span>
			</p>
		{/if}
		{#if repairsState.lastLoadedAt}
			<p class="text-xs text-muted-foreground">
				Last synced {formatRelativeTime(repairsState.lastLoadedAt)}
			</p>
		{/if}
	</div>

	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
		{#if repairsState.loading}
			{#each Array(6) as _, i (i)}
				<Card>
					<CardHeader class="pb-2">
						<Skeleton class="h-4 w-24" />
						<Skeleton class="mt-2 h-8 w-16" />
					</CardHeader>
				</Card>
			{/each}
		{:else}
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Total Repairs</CardDescription>
					<CardTitle class="text-3xl">{repairsState.repairs.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={pendingEstimates.length > 0 ? 'border-blue-500/50' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Pending Estimates</CardDescription>
					<CardTitle class="text-3xl">{pendingEstimates.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={allUnassigned.length > 0 ? 'border-yellow-500/50' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Need Assignment</CardDescription>
					<CardTitle class="text-3xl">{allUnassigned.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={allToday.length > 0 ? 'border-sky-500/40' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Today</CardDescription>
					<CardTitle class="text-3xl">{allToday.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Total Revenue</CardDescription>
					<CardTitle class="text-3xl">{formatCurrency(totalRevenue)}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={unpaidRevenue > 0 ? 'border-yellow-500/50' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Unpaid Revenue</CardDescription>
					<CardTitle class="text-3xl">{formatCurrency(unpaidRevenue)}</CardTitle>
				</CardHeader>
			</Card>
		{/if}
	</div>

	{#if hasQuery && matching.length === 0}
		<Card>
			<CardContent class="py-8">
				<div class="text-center text-sm text-muted-foreground">
					No repairs match <span class="font-medium text-foreground">{query}</span>
				</div>
			</CardContent>
		</Card>
	{/if}

	{#if overdue.length > 0}
		<Card class="border-destructive/50">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<AlertTriangleIcon class="h-5 w-5 text-destructive" />
					Overdue Repairs
				</CardTitle>
				<CardDescription>
					Appointments that are past due and still open ({overdue.length})
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-3">
				{#each overdue.slice(0, 6) as repair (repair.id)}
					<div class="flex items-center gap-2 rounded-lg border p-3">
						<button
							type="button"
							onclick={() => goto(resolve(`/app/cars/${repair.carId}`))}
							class="flex flex-1 items-center text-left transition-colors hover:opacity-80"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repairsState.cars, repair.carId)}
								</div>
								<div class="text-sm text-destructive">
									Was due {formatDateTime(repair.appointmentAt)}
								</div>
							</div>
							<Badge variant={STATUS_COLORS[repair.status]}>{STATUS_LABELS[repair.status]}</Badge>
						</button>
						<QuickStatusButton {repair} onadvance={handleWorkflowAction} />
					</div>
				{/each}
			</CardContent>
		</Card>
	{/if}

	{#if repairsState.loading}
		<div class="space-y-4">
			{#each Array(3) as _, i (i)}
				<Skeleton class="h-20 w-full rounded-lg" />
			{/each}
		</div>
	{:else}
		{#if pendingEstimates.length > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<AlertCircleIcon class="h-5 w-5 text-blue-500" />
						Pending Estimates
					</CardTitle>
					<CardDescription>
						Estimates awaiting customer approval ({pendingEstimates.length})
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each pendingEstimates as repair (repair.id)}
						<button
							type="button"
							onclick={() => goto(resolve(`/app/cars/${repair.carId}`))}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repairsState.cars, repair.carId)}
								</div>
								<div class="text-sm text-muted-foreground">
									Estimated: {formatCurrency(repair.estimatedCost ?? 0)} — {formatDate(
										repair.createdAt
									)}
									{#if repair.appointmentAt}
										<span class="ml-1 inline-flex items-center gap-1">
											<CalendarClockIcon class="size-3" />
											{new Date(repair.appointmentAt).toLocaleString('en-US', {
												month: 'short',
												day: 'numeric',
												hour: 'numeric',
												minute: '2-digit'
											})}
										</span>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Badge variant={STATUS_COLORS[repair.status]}>
									{STATUS_LABELS[repair.status]}
								</Badge>
								<ChevronRightIcon class="h-4 w-4 text-muted-foreground" />
							</div>
						</button>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if activeRepairs.length > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<WrenchIcon class="h-5 w-5" />
						Active Repairs
					</CardTitle>
					<CardDescription>Repairs currently in progress ({activeRepairs.length})</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each activeRepairs as repair (repair.id)}
						<div class="flex items-center gap-2 rounded-lg border p-3">
							<button
								type="button"
								onclick={() => goto(resolve(`/app/cars/${repair.carId}`))}
								class="flex flex-1 items-center text-left transition-colors hover:opacity-80"
							>
								<div class="flex-1">
									<div class="font-medium">{repair.title}</div>
									<div class="text-sm text-muted-foreground">
										{carLabel(repairsState.cars, repair.carId)}
									</div>
									<div class="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
										{#if repair.assignedMechanic}
											<span class="flex items-center gap-1">
												<UserIcon class="size-3" />
												{repair.assignedMechanic.name ?? repair.assignedMechanic.email}
											</span>
										{:else if repair.assignedMechanicId}
											<span class="flex items-center gap-1">
												<UserIcon class="size-3" />
												Mechanic assigned
											</span>
										{:else}
											<span>No mechanic assigned</span>
										{/if}
										{#if repair.appointmentAt}
											<span class="flex items-center gap-1">
												<CalendarClockIcon class="size-3" />
												{new Date(repair.appointmentAt).toLocaleString('en-US', {
													month: 'short',
													day: 'numeric',
													hour: 'numeric',
													minute: '2-digit'
												})}
											</span>
										{:else if repair.startDate}
											<span>Started {formatDate(repair.startDate)}</span>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-3">
									<div class="text-right">
										<Badge variant={STATUS_COLORS[repair.status]}>
											{STATUS_LABELS[repair.status]}
										</Badge>
										<div class="mt-1 text-sm font-medium">{formatCurrency(repair.totalCost)}</div>
									</div>
									<ChevronRightIcon class="h-4 w-4 text-muted-foreground" />
								</div>
							</button>
							<QuickStatusButton {repair} onadvance={handleWorkflowAction} />
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if awaitingPayment.length > 0}
			<Card>
				<CardHeader>
					<CardTitle>Awaiting Payment</CardTitle>
					<CardDescription>
						Completed repairs waiting for payment ({awaitingPayment.length})
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each awaitingPayment as repair (repair.id)}
						<div class="rounded-lg border">
							<div class="flex items-center justify-between p-3">
								<button
									type="button"
									onclick={() => toggle(repair.id)}
									class="flex flex-1 items-center text-left transition-colors hover:opacity-80"
								>
									<div class="flex-1">
										<div class="font-medium">{repair.title}</div>
										<div class="text-sm text-muted-foreground">
											{carLabel(repairsState.cars, repair.carId)}
										</div>
									</div>
									<div class="flex items-center gap-3">
										<div class="text-right">
											<div class="text-sm font-medium">{formatCurrency(repair.totalCost)}</div>
											<div class="text-xs text-yellow-600">
												Due: {formatCurrency(repair.totalCost - (repair.amountPaid ?? 0))}
											</div>
										</div>
										<ChevronRightIcon
											class="h-4 w-4 text-muted-foreground transition-transform {expanded ===
											repair.id
												? 'rotate-90'
												: ''}"
										/>
									</div>
								</button>
								<Button
									variant="ghost"
									size="icon"
									class="ml-2 shrink-0"
									onclick={() => goto(resolve(`/app/cars/${repair.carId}`))}
								>
									<CarIcon class="h-4 w-4" />
								</Button>
							</div>
							{#if expanded === repair.id}
								<div class="border-t p-3">
									<PaymentForm {repair} onPaymentRecorded={handleWorkflowAction} />
								</div>
							{/if}
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if completedRepairs.length > 0}
			<Card>
				<CardHeader>
					<CardTitle>Recently Completed</CardTitle>
					<CardDescription>Last 5 completed repairs</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each completedRepairs as repair (repair.id)}
						<button
							type="button"
							onclick={() => goto(resolve(`/app/cars/${repair.carId}`))}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repairsState.cars, repair.carId)}
								</div>
								<div class="text-sm text-muted-foreground">
									Completed {formatDate(repair.completedDate)}
								</div>
							</div>
							<div class="flex items-center gap-3">
								<div class="text-right">
									<Badge variant={STATUS_COLORS[repair.status]}>
										{STATUS_LABELS[repair.status]}
									</Badge>
									<div class="mt-1 text-sm font-medium">{formatCurrency(repair.totalCost)}</div>
								</div>
								<ChevronRightIcon class="h-4 w-4 text-muted-foreground" />
							</div>
						</button>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if repairsState.repairs.length === 0}
			<Card>
				<CardContent class="py-12">
					<div class="flex flex-col items-center text-center text-muted-foreground">
						<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
							<StoreIcon class="h-8 w-8" />
						</div>
						<p class="text-lg font-medium">No repairs yet</p>
						<p class="mb-4 max-w-sm text-sm">
							Repairs will appear here once customers bring vehicles to your shop. Start by adding
							cars and creating repair records.
						</p>
						<Button variant="outline" onclick={() => goto(resolve('/app/cars'))}>
							<CarIcon class="size-4" />
							View Cars
						</Button>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>
