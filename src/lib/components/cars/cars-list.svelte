<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { useRepairs } from '$lib/hooks/repairs.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { CarIcon, PlusIcon, SearchIcon } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import CarForm from './car-form.svelte';

	const repairs = useRepairs();
	let showAddForm = $state(false);
	let searchQuery = $state('');

	const filteredCars = $derived(
		repairs.cars.filter((car) => {
			const query = searchQuery.toLowerCase();
			return (
				car.brand.toLowerCase().includes(query) ||
				car.model.toLowerCase().includes(query) ||
				car.licensePlate.toLowerCase().includes(query) ||
				car.ownerName.toLowerCase().includes(query)
			);
		})
	);

	const getCarRepairCount = (carId: string) => {
		return repairs.repairs.filter((r) => r.carId === carId).length;
	};
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold">Cars</h1>
			<p class="text-muted-foreground">Manage your car inventory</p>
		</div>
		<Button onclick={() => (showAddForm = true)}>
			<PlusIcon />
			Add Car
		</Button>
	</div>

	<div class="relative">
		<SearchIcon class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
		<Input
			bind:value={searchQuery}
			placeholder="Search by brand, model, plate, or owner..."
			class="pl-9"
		/>
	</div>

	{#if showAddForm}
		<div transition:fly={{ y: -20, duration: 300 }}>
			<CarForm onCancel={() => (showAddForm = false)} onSuccess={() => (showAddForm = false)} />
		</div>
	{/if}

	{#if filteredCars.length === 0}
		<Card class="border-dashed">
			<CardContent class="flex flex-col items-center justify-center py-12">
				<CarIcon class="mb-4 size-12 text-muted-foreground" />
				<p class="text-center text-muted-foreground">
					{searchQuery ? 'No cars found matching your search' : 'No cars added yet'}
				</p>
				{#if !searchQuery && !showAddForm}
					<Button variant="outline" class="mt-4" onclick={() => (showAddForm = true)}>
						<PlusIcon />
						Add Your First Car
					</Button>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredCars as car (car.id)}
				<div transition:fly={{ y: 20, duration: 300 }}>
					<Card
						class="hover:shadow-lg-lg-lg hover:shadow-lg-lg-primary/10 cursor-pointer transition-all duration-200"
						onclick={() => goto(resolve(`/app/cars/${car.id}`))}
					>
						<CardHeader>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<CardTitle class="text-xl">{car.brand} {car.model}</CardTitle>
									<CardDescription>{car.year} • {car.color}</CardDescription>
								</div>
								<Badge variant="secondary">{getCarRepairCount(car.id)} repairs</Badge>
							</div>
						</CardHeader>
						<CardContent class="flex flex-col gap-2">
							<div class="flex items-center gap-2 text-sm">
								<span class="font-medium">Plate:</span>
								<span class="text-muted-foreground">{car.licensePlate}</span>
							</div>
							<div class="flex items-center gap-2 text-sm">
								<span class="font-medium">Owner:</span>
								<span class="text-muted-foreground">{car.ownerName}</span>
							</div>
							<div class="flex items-center gap-2 text-sm">
								<span class="font-medium">VIN:</span>
								<span class="font-mono text-xs text-muted-foreground">{car.vin}</span>
							</div>
						</CardContent>
					</Card>
				</div>
			{/each}
		</div>
	{/if}
</div>
