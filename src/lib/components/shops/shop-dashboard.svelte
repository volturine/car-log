<script lang="ts">
	import { useRepairs } from '$lib/hooks/repairs.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { REPAIR_STATUS, STATUS_COLORS, STATUS_LABELS } from '$lib/constants';
	import { formatCurrency, formatDate } from '$lib/utils';
	import type { Repair } from '$lib/types';

	const repairsState = useRepairs();

	let pendingEstimates = $derived(
		repairsState.repairs.filter((r) => r.status === REPAIR_STATUS.ESTIMATE_PENDING)
	);

	let activeRepairs = $derived(
		repairsState.repairs.filter(
			(r) => r.status === REPAIR_STATUS.ESTIMATE_APPROVED || r.status === REPAIR_STATUS.IN_PROGRESS
		)
	);

	let completedRepairs = $derived(
		repairsState.repairs
			.filter((r) => r.status === REPAIR_STATUS.COMPLETED || r.status === REPAIR_STATUS.PAID)
			.slice(0, 5)
	);

	let totalRevenue = $derived(
		repairsState.repairs
			.filter((r) => r.status === REPAIR_STATUS.PAID)
			.reduce((sum, r) => sum + r.totalCost, 0)
	);

	let unpaidRevenue = $derived(
		repairsState.repairs
			.filter((r) => r.status === REPAIR_STATUS.COMPLETED)
			.reduce((sum, r) => sum + (r.totalCost - (r.amountPaid ?? 0)), 0)
	);

	function getStatusColor(status: string): string {
		return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
	}

	function getStatusLabel(status: string): string {
		return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
	}

	function carLabel(repair: Repair): string {
		const car = repairsState.cars.find((c) => c.id === repair.carId);
		if (!car) return 'Unknown vehicle';
		return `${car.brand} ${car.model} - ${car.licensePlate}`;
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Shop Dashboard</h1>
			<p class="text-muted-foreground">Manage repairs and track your shop's performance</p>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="pb-2">
				<CardDescription>Total Repairs</CardDescription>
				<CardTitle class="text-3xl">{repairsState.repairs.length}</CardTitle>
			</CardHeader>
		</Card>

		<Card>
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

		<Card>
			<CardHeader class="pb-2">
				<CardDescription>Unpaid Revenue</CardDescription>
				<CardTitle class="text-3xl">{formatCurrency(unpaidRevenue)}</CardTitle>
			</CardHeader>
		</Card>
	</div>

	<!-- Pending Estimates -->
	{#if pendingEstimates.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Pending Estimates</CardTitle>
				<CardDescription>
					Estimates awaiting customer approval ({pendingEstimates.length})
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					{#each pendingEstimates as repair (repair.id)}
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repair)}
								</div>
								<div class="text-sm text-muted-foreground">
									Estimated: {formatCurrency(repair.estimatedCost ?? 0)} - {formatDate(
										repair.createdAt
									)}
								</div>
							</div>
							<Badge class="bg-{getStatusColor(repair.status)}">
								{getStatusLabel(repair.status)}
							</Badge>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Active Repairs -->
	{#if activeRepairs.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Active Repairs</CardTitle>
				<CardDescription>Repairs currently in progress ({activeRepairs.length})</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					{#each activeRepairs as repair (repair.id)}
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repair)}
								</div>
								<div class="text-sm text-muted-foreground">
									{#if repair.assignedMechanicId}
										Assigned mechanic • Started {formatDate(repair.startDate)}
									{:else}
										No mechanic assigned
									{/if}
								</div>
							</div>
							<div class="text-right">
								<Badge class="bg-{getStatusColor(repair.status)}">
									{getStatusLabel(repair.status)}
								</Badge>
								<div class="mt-1 text-sm font-medium">{formatCurrency(repair.totalCost)}</div>
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Recent Completed -->
	{#if completedRepairs.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Recently Completed</CardTitle>
				<CardDescription>Last 5 completed repairs</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					{#each completedRepairs as repair (repair.id)}
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repair)}
								</div>
								<div class="text-sm text-muted-foreground">
									Completed {formatDate(repair.completedDate)}
								</div>
							</div>
							<div class="text-right">
								<Badge class="bg-{getStatusColor(repair.status)}">
									{getStatusLabel(repair.status)}
								</Badge>
								<div class="mt-1 text-sm font-medium">{formatCurrency(repair.totalCost)}</div>
								{#if repair.status === REPAIR_STATUS.COMPLETED}
									<div class="text-xs text-yellow-600">Awaiting payment</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	{#if repairsState.repairs.length === 0}
		<Card>
			<CardContent class="py-12">
				<div class="text-center text-muted-foreground">
					<p class="text-lg font-medium">No repairs yet</p>
					<p class="text-sm">Create your first repair to get started</p>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
