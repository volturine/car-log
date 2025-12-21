<script lang="ts">
	import { useRepairs } from '$lib/hooks/repairs.svelte.js';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { TrendingUpIcon, DollarSignIcon, WrenchIcon, CarIcon } from '@lucide/svelte';

	const repairs = useRepairs();

	const totalRepairs = $derived(repairs.repairs.length);
	const totalRevenue = $derived(repairs.repairs.reduce((sum, r) => sum + r.totalCost, 0));
	const averageRepairCost = $derived(totalRepairs > 0 ? totalRevenue / totalRepairs : 0);
	const completedRepairs = $derived(repairs.repairs.filter((r) => r.status === 'completed').length);
</script>

<div class="p-6 space-y-6">
	<div>
		<h1 class="text-3xl font-bold">Analytics</h1>
		<p class="text-muted-foreground">Repair statistics by brand and model</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Total Repairs</CardTitle>
				<WrenchIcon class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{totalRepairs}</div>
				<p class="text-xs text-muted-foreground">{completedRepairs} completed</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Total Revenue</CardTitle>
				<DollarSignIcon class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
				<p class="text-xs text-muted-foreground">All time</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Average Cost</CardTitle>
				<TrendingUpIcon class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">${averageRepairCost.toFixed(2)}</div>
				<p class="text-xs text-muted-foreground">Per repair</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Total Cars</CardTitle>
				<CarIcon class="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{repairs.cars.length}</div>
				<p class="text-xs text-muted-foreground">{repairs.brandStats.length} brands</p>
			</CardContent>
		</Card>
	</div>

	<div class="flex flex-col gap-4">
		<h2 class="text-2xl font-bold">By Brand</h2>
		{#if repairs.brandStats.length === 0}
			<Card class="border-dashed">
				<CardContent class="flex flex-col items-center justify-center py-12">
					<p class="text-muted-foreground">No repair data available yet</p>
				</CardContent>
			</Card>
		{:else}
			{#each repairs.brandStats as brand (brand.brand)}
				<Card>
					<CardHeader>
						<div class="flex items-center justify-between">
							<div>
								<CardTitle class="text-xl">{brand.brand}</CardTitle>
								<CardDescription
									>{brand.totalRepairs} repairs • ${brand.totalCost.toFixed(2)} total</CardDescription
								>
							</div>
							<Badge variant="secondary">${brand.averageCost.toFixed(2)} avg</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div class="flex flex-col gap-2">
							<p class="text-sm font-medium mb-2">Models:</p>
							{#each brand.models as model (model.model)}
								<div class="flex items-center justify-between p-3 bg-muted rounded-lg">
									<div class="flex-1">
										<p class="font-medium">{model.model}</p>
										<p class="text-sm text-muted-foreground">{model.totalRepairs} repairs</p>
									</div>
									<div class="text-right">
										<p class="font-medium">${model.totalCost.toFixed(2)}</p>
										<p class="text-sm text-muted-foreground">${model.averageCost.toFixed(2)} avg</p>
									</div>
								</div>
							{/each}
						</div>
					</CardContent>
				</Card>
			{/each}
		{/if}
	</div>
</div>
