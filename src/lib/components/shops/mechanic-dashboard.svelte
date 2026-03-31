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
		WrenchIcon,
		InboxIcon,
		CalendarClockIcon,
		UserIcon,
		CarIcon
	} from '@lucide/svelte';
	import QuickStatusButton from '$lib/components/repairs/quick-status-button.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { Shop } from '$lib/types';

	let { shop, userId }: { shop: Shop | null; userId: string } = $props();

	const repairs = useRepairs();

	const mine = $derived(
		repairs.repairs.filter(
			(r) =>
				r.assignedMechanicId === userId &&
				r.status !== REPAIR_STATUS.COMPLETED &&
				r.status !== REPAIR_STATUS.PAID
		)
	);

	const unassigned = $derived(
		repairs.repairs.filter(
			(r) =>
				!r.assignedMechanicId &&
				r.status !== REPAIR_STATUS.COMPLETED &&
				r.status !== REPAIR_STATUS.PAID &&
				r.status !== REPAIR_STATUS.ESTIMATE_REJECTED
		)
	);

	const today = $derived.by(() => {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const end = new Date(start.getTime() + 86400000);
		return repairs.repairs.filter((r) => {
			if (!r.appointmentAt) return false;
			const apt = new Date(r.appointmentAt);
			return apt >= start && apt < end;
		});
	});

	const completed = $derived(
		repairs.repairs
			.filter(
				(r) =>
					r.assignedMechanicId === userId &&
					(r.status === REPAIR_STATUS.COMPLETED || r.status === REPAIR_STATUS.PAID)
			)
			.slice(0, 5)
	);

	function refresh() {
		repairs.loadData();
	}
</script>

<div class="space-y-6 p-6">
	<div>
		<h1 class="text-3xl font-bold">{shop?.name ?? 'My Workbench'}</h1>
		<p class="text-muted-foreground">Your repairs and upcoming work</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		{#if repairs.loading}
			{#each Array(3) as _, i (i)}
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
					<CardDescription>My Jobs</CardDescription>
					<CardTitle class="text-3xl">{mine.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={unassigned.length > 0 ? 'border-yellow-500/50' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Unassigned</CardDescription>
					<CardTitle class="text-3xl">{unassigned.length}</CardTitle>
				</CardHeader>
			</Card>

			<Card class={today.length > 0 ? 'border-blue-500/50' : ''}>
				<CardHeader class="pb-2">
					<CardDescription>Today</CardDescription>
					<CardTitle class="text-3xl">{today.length}</CardTitle>
				</CardHeader>
			</Card>
		{/if}
	</div>

	{#if repairs.loading}
		<div class="space-y-4">
			{#each Array(3) as _, i (i)}
				<Skeleton class="h-20 w-full rounded-lg" />
			{/each}
		</div>
	{:else}
		{#if mine.length > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<WrenchIcon class="size-5" />
						My Jobs
					</CardTitle>
					<CardDescription>Repairs assigned to you ({mine.length})</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each mine as repair (repair.id)}
						<div class="flex items-center gap-2 rounded-lg border p-3">
							<button
								type="button"
								onclick={() => goto(carPath(repair.carId))}
								class="flex flex-1 items-center text-left transition-colors hover:opacity-80"
							>
								<div class="flex-1">
									<div class="font-medium">{repair.title}</div>
									<div class="text-sm text-muted-foreground">
										{carLabel(repairs.cars, repair.carId)}
									</div>
									<div class="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
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
									<ChevronRightIcon class="size-4 text-muted-foreground" />
								</div>
							</button>
							<QuickStatusButton {repair} onadvance={refresh} />
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if today.length > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<CalendarClockIcon class="size-5 text-blue-500" />
						Today
					</CardTitle>
					<CardDescription>Appointments scheduled for today ({today.length})</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each today as repair (repair.id)}
						<div class="flex items-center gap-2 rounded-lg border p-3">
							<button
								type="button"
								onclick={() => goto(carPath(repair.carId))}
								class="flex flex-1 items-center text-left transition-colors hover:opacity-80"
							>
								<div class="flex-1">
									<div class="font-medium">{repair.title}</div>
									<div class="text-sm text-muted-foreground">
										{carLabel(repairs.cars, repair.carId)}
									</div>
									<div class="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
										{#if repair.appointmentAt}
											<span class="flex items-center gap-1">
												<CalendarClockIcon class="size-3" />
												{new Date(repair.appointmentAt).toLocaleString('en-US', {
													hour: 'numeric',
													minute: '2-digit'
												})}
											</span>
										{/if}
										{#if repair.assignedMechanic}
											<span class="flex items-center gap-1">
												<UserIcon class="size-3" />
												{repair.assignedMechanic.name ?? repair.assignedMechanic.email}
											</span>
										{:else if !repair.assignedMechanicId}
											<span class="text-yellow-600">Unassigned</span>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-3">
									<Badge variant={STATUS_COLORS[repair.status]}>
										{STATUS_LABELS[repair.status]}
									</Badge>
									<ChevronRightIcon class="size-4 text-muted-foreground" />
								</div>
							</button>
							<QuickStatusButton {repair} onadvance={refresh} />
						</div>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if unassigned.length > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<InboxIcon class="size-5 text-yellow-500" />
						Unassigned
					</CardTitle>
					<CardDescription>
						Repairs not yet assigned to a mechanic ({unassigned.length})
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each unassigned as repair (repair.id)}
						<button
							type="button"
							onclick={() => goto(carPath(repair.carId))}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repairs.cars, repair.carId)}
								</div>
								<div class="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
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
									{/if}
									<span>
										Estimated: {formatCurrency(repair.estimatedCost ?? 0)}
									</span>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Badge variant={STATUS_COLORS[repair.status]}>
									{STATUS_LABELS[repair.status]}
								</Badge>
								<ChevronRightIcon class="size-4 text-muted-foreground" />
							</div>
						</button>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if completed.length > 0}
			<Card>
				<CardHeader>
					<CardTitle>Recently Completed</CardTitle>
					<CardDescription>Your last completed jobs</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each completed as repair (repair.id)}
						<button
							type="button"
							onclick={() => goto(carPath(repair.carId))}
							class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
						>
							<div class="flex-1">
								<div class="font-medium">{repair.title}</div>
								<div class="text-sm text-muted-foreground">
									{carLabel(repairs.cars, repair.carId)}
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
								<ChevronRightIcon class="size-4 text-muted-foreground" />
							</div>
						</button>
					{/each}
				</CardContent>
			</Card>
		{/if}

		{#if mine.length === 0 && unassigned.length === 0 && today.length === 0}
			<Card>
				<CardContent class="py-12">
					<div class="flex flex-col items-center text-center text-muted-foreground">
						<div class="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
							<WrenchIcon class="size-8" />
						</div>
						<p class="text-lg font-medium">No active work</p>
						<p class="mb-4 max-w-sm text-sm">
							You have no assigned repairs or upcoming appointments. Check back later or browse cars
							to find work.
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
