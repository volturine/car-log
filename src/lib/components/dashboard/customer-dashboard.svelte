<script lang="ts">
	import { useRepairs } from '$lib/hooks/repairs.svelte.js';
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
	import EstimateApprovalCard from '$lib/components/repairs/estimate-approval-card.svelte';
	import {
		ChevronRightIcon,
		ClockIcon,
		CarIcon,
		WrenchIcon,
		DollarSignIcon,
		LayoutDashboardIcon,
		AlertCircleIcon,
		AlertTriangleIcon,
		SearchIcon,
		XIcon,
		CalendarClockIcon,
		RefreshCwIcon
	} from '@lucide/svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';

	const repairs = useRepairs();

	let expanded = $state<string | null>(null);
	let query = $state('');

	const allPending = $derived(repairs.pendingEstimates);

	const allActive = $derived(repairs.activeRepairs);

	const upcoming = $derived(repairs.upcomingAppointments);

	const next = $derived(upcoming[0] ?? null);

	const outstanding = $derived(repairs.outstandingRevenue);

	const matching = $derived.by(() => {
		const search = query.trim().toLowerCase();

		if (!search) {
			return repairs.repairs;
		}

		return repairs.repairs.filter((repair) => {
			const label = carLabel(repairs.cars, repair.carId).toLowerCase();
			const title = repair.title.toLowerCase();
			const desc = repair.description.toLowerCase();
			const status = STATUS_LABELS[repair.status].toLowerCase();
			return (
				title.includes(search) ||
				desc.includes(search) ||
				status.includes(search) ||
				label.includes(search)
			);
		});
	});

	const pending = $derived(matching.filter((r) => r.status === REPAIR_STATUS.ESTIMATE_PENDING));

	const active = $derived(
		matching.filter(
			(r) =>
				r.status === REPAIR_STATUS.IN_PROGRESS ||
				r.status === REPAIR_STATUS.ESTIMATE_APPROVED ||
				r.status === REPAIR_STATUS.PENDING
		)
	);

	const unpaid = $derived(matching.filter((r) => r.status === REPAIR_STATUS.COMPLETED));

	const recent = $derived(
		matching
			.toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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

	const hasQuery = $derived(query.trim().length > 0);

	function toggle(id: string) {
		expanded = expanded === id ? null : id;
	}

	function clearSearch() {
		query = '';
	}

	async function refresh() {
		await repairs.loadData();
	}

	function handleAction() {
		refresh();
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<h1 class="text-3xl font-bold">Dashboard</h1>
			<p class="text-muted-foreground">Overview of your vehicles and repairs</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button variant="outline" onclick={refresh} disabled={repairs.loading}>
				<RefreshCwIcon class="size-4" />
				Refresh
			</Button>
			<Button variant="outline" onclick={() => goto(resolve('/app/calendar'))}>
				<CalendarClockIcon class="size-4" />
				Calendar
			</Button>
			<Button variant="outline" onclick={() => goto(resolve('/app/cars'))}>
				<CarIcon class="size-4" />
				View Cars
			</Button>
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
				placeholder="Search by repair, status, or vehicle"
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
		{#if repairs.lastLoadedAt}
			<p class="text-xs text-muted-foreground">
				Last synced {formatRelativeTime(repairs.lastLoadedAt)}
			</p>
		{/if}
	</div>

	{#if repairs.loading}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
			{#each Array(5) as _, i (i)}
				<Card>
					<CardHeader class="pb-2">
						<Skeleton class="h-4 w-24" />
						<Skeleton class="mt-2 h-8 w-16" />
					</CardHeader>
				</Card>
			{/each}
		</div>
		<div class="space-y-4">
			{#each Array(3) as _, i (i)}
				<Skeleton class="h-20 w-full rounded-lg" />
			{/each}
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Vehicles</CardDescription>
					<CardTitle class="text-3xl">{repairs.cars.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>Total Repairs</CardDescription>
					<CardTitle class="text-3xl">{repairs.repairs.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={allActive.length > 0 ? 'border-sky-500/40' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Active Repairs</CardDescription>
					<CardTitle class="text-3xl">{allActive.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={upcoming.length > 0 ? 'border-blue-500/50' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Upcoming Visits</CardDescription>
					<CardTitle class="text-3xl">{upcoming.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={allPending.length > 0 ? 'border-blue-500/50' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Awaiting Approval</CardDescription>
					<CardTitle class="text-3xl">{allPending.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={outstanding > 0 ? 'border-yellow-500/50' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Outstanding Balance</CardDescription>
					<CardTitle class="text-3xl">{formatCurrency(outstanding)}</CardTitle>
				</CardHeader>
			</Card>
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
						Needs Attention
					</CardTitle>
					<CardDescription>
						Appointments that are past due and still open ({overdue.length})
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each overdue.slice(0, 4) as repair (repair.id)}
						<button
							type="button"
							onclick={() => goto(resolve(`/app/cars/${repair.carId}`))}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div>
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repairs.cars, repair.carId)}
								</div>
								<div class="text-sm text-destructive">
									Was due {formatDateTime(repair.appointmentAt)}
								</div>
							</div>
							<Badge variant={STATUS_COLORS[repair.status]}>{STATUS_LABELS[repair.status]}</Badge>
						</button>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if pending.length > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<AlertCircleIcon class="h-5 w-5 text-blue-500" />
						Estimates Awaiting Approval
					</CardTitle>
					<CardDescription>
						Review and approve these estimates to proceed ({pending.length})
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#each pending as repair (repair.id)}
						<div class="rounded-lg border">
							<button
								type="button"
								onclick={() => toggle(repair.id)}
								class="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-accent/50"
							>
								<div class="flex-1">
									<div class="font-medium">{repair.title}</div>
									<div class="text-sm text-muted-foreground">
										{carLabel(repairs.cars, repair.carId)}
									</div>
									<div class="text-sm text-muted-foreground">
										Estimated: {formatCurrency(repair.estimatedCost ?? 0)} — {formatDate(
											repair.createdAt
										)}
									</div>
								</div>
								<div class="flex items-center gap-2">
									<Badge variant={STATUS_COLORS[repair.status]}>
										{STATUS_LABELS[repair.status]}
									</Badge>
									<ChevronRightIcon
										class="h-4 w-4 text-muted-foreground transition-transform {expanded ===
										repair.id
											? 'rotate-90'
											: ''}"
									/>
								</div>
							</button>
							{#if expanded === repair.id}
								<div class="border-t p-3">
									<EstimateApprovalCard {repair} onApprove={handleAction} />
								</div>
							{/if}
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if active.length > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<WrenchIcon class="h-5 w-5" />
						Active Repairs
					</CardTitle>
					<CardDescription>Repairs currently being worked on ({active.length})</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each active as repair (repair.id)}
						<button
							type="button"
							onclick={() => goto(resolve(`/app/cars/${repair.carId}`))}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repairs.cars, repair.carId)}
								</div>
								{#if repair.startDate}
									<div class="text-sm text-muted-foreground">
										Started {formatDate(repair.startDate)}
									</div>
								{/if}
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

		{#if unpaid.length > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<DollarSignIcon class="h-5 w-5 text-yellow-500" />
						Awaiting Payment
					</CardTitle>
					<CardDescription>
						Completed repairs with outstanding balances ({unpaid.length})
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each unpaid as repair (repair.id)}
						<button
							type="button"
							onclick={() => goto(resolve(`/app/cars/${repair.carId}`))}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repairs.cars, repair.carId)}
								</div>
							</div>
							<div class="flex items-center gap-3">
								<div class="text-right">
									<div class="text-sm font-medium">{formatCurrency(repair.totalCost)}</div>
									<div class="text-xs text-yellow-600 dark:text-yellow-400">
										Due: {formatCurrency(repair.totalCost - (repair.amountPaid ?? 0))}
									</div>
								</div>
								<ChevronRightIcon class="h-4 w-4 text-muted-foreground" />
							</div>
						</button>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if recent.length > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<ClockIcon class="h-5 w-5" />
						Recent Repairs
					</CardTitle>
					<CardDescription>Your latest repair activity</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each recent as repair (repair.id)}
						<button
							type="button"
							onclick={() => goto(resolve(`/app/cars/${repair.carId}`))}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repairs.cars, repair.carId)}
								</div>
								<div class="text-sm text-muted-foreground">
									{formatDate(repair.createdAt)}
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

		{#if repairs.repairs.length === 0 && repairs.cars.length === 0}
			<Card>
				<CardContent class="py-12">
					<div class="flex flex-col items-center text-center text-muted-foreground">
						<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
							<LayoutDashboardIcon class="h-8 w-8" />
						</div>
						<p class="text-lg font-medium">Welcome to Auto Repair</p>
						<p class="mb-4 max-w-sm text-sm">
							Get started by adding your first vehicle. Repairs and estimates will appear here as
							they are created.
						</p>
						<Button variant="outline" onclick={() => goto(resolve('/app/cars'))}>
							<CarIcon class="size-4" />
							Add Your First Car
						</Button>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>
