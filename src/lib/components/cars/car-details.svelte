<script lang="ts">
	import { useRepairs } from '$lib/hooks/repairs.svelte.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import CarForm from './car-form.svelte';
	import RepairForm from '../repairs/repair-form.svelte';
	import RepairCard from '../repairs/repair-card.svelte';
	import { ArrowLeftIcon, PlusIcon, EditIcon, Trash2Icon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';

	const repairs = useRepairs();
	let showEditForm = $state(false);
	let showAddRepair = $state(false);

	const handleDelete = async () => {
		if (!repairs.selectedCar) return;
		if (
			confirm(
				`Are you sure you want to delete ${repairs.selectedCar.brand} ${repairs.selectedCar.model}? This will also delete all associated repairs.`
			)
		) {
			await repairs.deleteCar(repairs.selectedCar.id);
			toast.success('Car deleted successfully');
			goto(resolve('/app/cars'));
		}
	};

	const totalCost = $derived(repairs.carRepairs.reduce((sum, r) => sum + r.totalCost, 0));
</script>

{#if repairs.selectedCar}
	<div class="space-y-6 p-6">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={() => goto(resolve('/app/cars'))}>
				<ArrowLeftIcon />
			</Button>
			<div class="flex-1">
				<h1 class="text-3xl font-bold">{repairs.selectedCar.brand} {repairs.selectedCar.model}</h1>
				<p class="text-muted-foreground">
					{repairs.selectedCar.year} • {repairs.selectedCar.licensePlate}
				</p>
			</div>
			<Button variant="outline" size="icon" onclick={() => (showEditForm = !showEditForm)}>
				<EditIcon />
			</Button>
			<Button variant="destructive" size="icon" onclick={handleDelete}>
				<Trash2Icon />
			</Button>
		</div>

		{#if showEditForm}
			<div transition:fly={{ y: -20, duration: 300 }}>
				<CarForm
					car={repairs.selectedCar}
					onCancel={() => (showEditForm = false)}
					onSuccess={() => (showEditForm = false)}
				/>
			</div>
		{/if}

		<Card>
			<CardHeader>
				<CardTitle>Vehicle Information</CardTitle>
			</CardHeader>
			<CardContent class="grid gap-4 md:grid-cols-2">
				<div>
					<p class="text-sm text-muted-foreground">Owner</p>
					<p class="font-medium">{repairs.selectedCar.ownerName}</p>
					{#if repairs.selectedCar.ownerPhone}
						<p class="text-sm text-muted-foreground">{repairs.selectedCar.ownerPhone}</p>
					{/if}
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Color</p>
					<p class="font-medium">{repairs.selectedCar.color}</p>
				</div>
				{#if repairs.selectedCar.vin}
					<div class="md:col-span-2">
						<p class="text-sm text-muted-foreground">VIN</p>
						<p class="font-mono text-sm font-medium">{repairs.selectedCar.vin}</p>
					</div>
				{/if}
			</CardContent>
		</Card>

		<Separator />

		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-2xl font-bold">Repair History</h2>
				<p class="text-muted-foreground">
					{repairs.carRepairs.length} repairs • Total: ${totalCost.toFixed(2)}
				</p>
			</div>
			<Button onclick={() => (showAddRepair = true)}>
				<PlusIcon />
				Add Repair
			</Button>
		</div>

		{#if showAddRepair}
			<div transition:fly={{ y: -20, duration: 300 }}>
				<RepairForm
					carId={repairs.selectedCar.id}
					onCancel={() => (showAddRepair = false)}
					onSuccess={() => (showAddRepair = false)}
				/>
			</div>
		{/if}

		{#if repairs.carRepairs.length === 0}
			<Card class="border-dashed">
				<CardContent class="flex flex-col items-center justify-center py-12">
					<p class="text-lg font-medium text-muted-foreground">No repairs recorded yet</p>
					<p class="mt-1 text-sm text-muted-foreground">
						Add your first repair to start tracking service history.
					</p>
					{#if !showAddRepair}
						<Button variant="outline" class="mt-4" onclick={() => (showAddRepair = true)}>
							<PlusIcon />
							Add First Repair
						</Button>
					{/if}
				</CardContent>
			</Card>
		{:else}
			<div class="flex flex-col gap-6">
				{#each repairs.carRepairs as repair (repair.id)}
					<div class="flex flex-col gap-3" transition:fly={{ y: 20, duration: 300 }}>
						<RepairCard {repair} />
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
