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
	import { USER_ROLE } from '$lib/constants';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { ShopMember } from '$lib/types';

	let {
		user = undefined
	}: {
		user?: { id?: string; role?: string | null; shopId?: string | null } | null;
	} = $props();

	const repairs = useRepairs();
	let showEditForm = $state(false);
	let showAddRepair = $state(false);
	let shopMembers = $state<Array<{ userId: string; userName: string | null; role: string }>>([]);

	const isShopUser = $derived(
		user?.role === USER_ROLE.SHOP_OWNER || user?.role === USER_ROLE.MECHANIC
	);
	const userShopId = $derived(isShopUser ? (user?.shopId ?? '') : '');

	// Side effect: fetch shop members when shop user opens form
	$effect(() => {
		if (isShopUser && userShopId) {
			fetchShopMembers(userShopId);
		}
	});

	async function fetchShopMembers(shopId: string) {
		const response = await fetch(`/api/shops/${shopId}`).catch(() => null);
		if (!response || !response.ok) return;
		const result = await response.json();
		const data = result.data ?? result;
		shopMembers = (data.members ?? []).map((m: ShopMember) => ({
			userId: m.userId,
			userName: m.userName,
			role: m.role
		}));
	}

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

{#if repairs.loading}
	<div class="space-y-6 p-6">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={() => goto(resolve('/app/cars'))}>
				<ArrowLeftIcon />
			</Button>
			<div class="flex-1">
				<Skeleton class="h-8 w-48" />
				<Skeleton class="mt-2 h-4 w-32" />
			</div>
		</div>
		<Card>
			<CardHeader>
				<Skeleton class="h-6 w-40" />
			</CardHeader>
			<CardContent class="grid gap-4 md:grid-cols-2">
				<div>
					<Skeleton class="h-4 w-16" />
					<Skeleton class="mt-1 h-5 w-32" />
				</div>
				<div>
					<Skeleton class="h-4 w-16" />
					<Skeleton class="mt-1 h-5 w-24" />
				</div>
			</CardContent>
		</Card>
		<div class="space-y-4">
			{#each Array(2) as _, i (i)}
				<Skeleton class="h-32 w-full rounded-lg" />
			{/each}
		</div>
	</div>
{:else if repairs.selectedCar}
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
					user={user ?? undefined}
					shopId={userShopId}
					{shopMembers}
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
{:else}
	<div class="flex flex-col items-center justify-center gap-4 p-12 text-center">
		<p class="text-lg font-medium text-muted-foreground">Car not found</p>
		<p class="text-sm text-muted-foreground">
			The vehicle you're looking for doesn't exist or has been removed.
		</p>
		<Button variant="outline" onclick={() => goto(resolve('/app/cars'))}>
			<ArrowLeftIcon class="size-4" />
			Back to Cars
		</Button>
	</div>
{/if}
