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
	import { REPAIR_STATUS, STATUS_COLORS, STATUS_LABELS } from '$lib/constants';
	import { formatCurrency, formatDate, carLabel } from '$lib/utils';
	import { carPath } from '$lib/utils/navigation';
	import {
		ChevronRightIcon,
		AlertCircleIcon,
		CarIcon,
		StoreIcon,
		WrenchIcon,
		SettingsIcon,
		CalendarClockIcon,
		UserIcon
	} from '@lucide/svelte';
	import PaymentForm from '$lib/components/repairs/payment-form.svelte';
	import QuickStatusButton from '$lib/components/repairs/quick-status-button.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { Shop } from '$lib/types';

	let { shop, isOwner = false }: { shop: Shop | null; isOwner?: boolean } = $props();

	const repairsState = useRepairs();

	let expanded = $state<string | null>(null);

	const pendingEstimates = $derived(
		repairsState.repairs.filter((r) => r.status === REPAIR_STATUS.ESTIMATE_PENDING)
	);

	const activeRepairs = $derived(
		repairsState.repairs.filter(
			(r) => r.status === REPAIR_STATUS.ESTIMATE_APPROVED || r.status === REPAIR_STATUS.IN_PROGRESS
		)
	);

	const awaitingPayment = $derived(
		repairsState.repairs.filter((r) => r.status === REPAIR_STATUS.COMPLETED)
	);

	const completedRepairs = $derived(
		repairsState.repairs
			.filter((r) => r.status === REPAIR_STATUS.COMPLETED || r.status === REPAIR_STATUS.PAID)
			.slice(0, 5)
	);

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

	function toggle(id: string) {
		expanded = expanded === id ? null : id;
	}

	function handleWorkflowAction() {
		repairsState.loadData();
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">{shop?.name ?? 'Shop Dashboard'}</h1>
			<p class="text-muted-foreground">Manage repairs and track your shop's performance</p>
		</div>
		{#if isOwner}
			<Button variant="outline" onclick={() => goto(resolve('/app/shop/settings'))}>
				<SettingsIcon class="size-4" />
				Settings
			</Button>
		{/if}
	</div>

	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		{#if repairsState.loading}
			{#each Array(4) as _, i (i)}
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
							onclick={() => goto(carPath(repair.carId))}
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
								onclick={() => goto(carPath(repair.carId))}
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
									onclick={() => goto(carPath(repair.carId))}
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
							onclick={() => goto(carPath(repair.carId))}
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
