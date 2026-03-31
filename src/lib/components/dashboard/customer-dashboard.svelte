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
	import { REPAIR_STATUS, STATUS_COLORS, STATUS_LABELS } from '$lib/constants';
	import { formatCurrency, formatDate } from '$lib/utils';
	import EstimateApprovalCard from '$lib/components/repairs/estimate-approval-card.svelte';
	import {
		ChevronRightIcon,
		ClockIcon,
		CarIcon,
		WrenchIcon,
		DollarSignIcon,
		LayoutDashboardIcon,
		AlertCircleIcon
	} from '@lucide/svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { Repair } from '$lib/types';

	const repairs = useRepairs();

	let expanded = $state<string | null>(null);

	const pending = $derived(
		repairs.repairs.filter((r) => r.status === REPAIR_STATUS.ESTIMATE_PENDING)
	);

	const active = $derived(
		repairs.repairs.filter(
			(r) =>
				r.status === REPAIR_STATUS.IN_PROGRESS ||
				r.status === REPAIR_STATUS.ESTIMATE_APPROVED ||
				r.status === REPAIR_STATUS.PENDING
		)
	);

	const unpaid = $derived(repairs.repairs.filter((r) => r.status === REPAIR_STATUS.COMPLETED));

	const recent = $derived(
		repairs.repairs
			.toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.slice(0, 5)
	);

	const outstanding = $derived(
		unpaid.reduce((sum, r) => sum + (r.totalCost - (r.amountPaid ?? 0)), 0)
	);

	function carLabel(repair: Repair): string {
		const car = repairs.cars.find((c) => c.id === repair.carId);
		if (!car) return 'Unknown vehicle';
		return `${car.brand} ${car.model} — ${car.licensePlate}`;
	}

	function navigateToCar(repair: Repair) {
		goto(resolve(`/app/cars/${repair.carId}`));
	}

	function toggle(id: string) {
		expanded = expanded === id ? null : id;
	}

	function handleAction() {
		repairs.loadData();
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Dashboard</h1>
			<p class="text-muted-foreground">Overview of your vehicles and repairs</p>
		</div>
		<Button variant="outline" onclick={() => goto(resolve('/app/cars'))}>
			<CarIcon class="size-4" />
			View Cars
		</Button>
	</div>

	{#if repairs.loading}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _, i (i)}
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
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

			<Card class={pending.length > 0 ? 'border-blue-500/50' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Awaiting Approval</CardDescription>
					<CardTitle class="text-3xl">{pending.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={outstanding > 0 ? 'border-yellow-500/50' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Outstanding Balance</CardDescription>
					<CardTitle class="text-3xl">{formatCurrency(outstanding)}</CardTitle>
				</CardHeader>
			</Card>
		</div>

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
									<div class="text-sm text-muted-foreground">{carLabel(repair)}</div>
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
							onclick={() => navigateToCar(repair)}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">{carLabel(repair)}</div>
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
							onclick={() => navigateToCar(repair)}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">{carLabel(repair)}</div>
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
							onclick={() => navigateToCar(repair)}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">{carLabel(repair)}</div>
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
