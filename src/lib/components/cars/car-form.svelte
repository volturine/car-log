<script lang="ts">
	import { useRepairs } from '$lib/hooks/repairs.svelte.js';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import type { Car } from '$lib/types.js';

	let { car, onCancel, onSuccess }: Props = $props();

	const repairs = useRepairs();
	let isSubmitting = $state(false);
	let formData = $state(
		untrack(() => ({
			brand: car?.brand || '',
			model: car?.model || '',
			year: car?.year || new Date().getFullYear(),
			vin: car?.vin || '',
			licensePlate: car?.licensePlate || '',
			ownerName: car?.ownerName || '',
			ownerPhone: car?.ownerPhone || '',
			color: car?.color || ''
		}))
	);

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!formData.brand || !formData.model || !formData.licensePlate || !formData.ownerName) {
			toast.error('Please fill in all required fields');
			return;
		}

		if (isSubmitting) return;
		isSubmitting = true;

		try {
			if (car) {
				await repairs.updateCar(car.id, formData);
			} else {
				await repairs.addCar(formData);
			}
			onSuccess?.();
		} catch (error) {
			console.error('Failed to submit car:', error);
		} finally {
			isSubmitting = false;
		}
	};

	type Props = {
		car?: Car;
		onCancel?: () => void;
		onSuccess?: () => void;
	};
</script>

<Card>
	<form onsubmit={handleSubmit}>
		<CardHeader>
			<CardTitle>{car ? 'Edit Car' : 'Add New Car'}</CardTitle>
			<CardDescription>Enter the vehicle details</CardDescription>
		</CardHeader>
		<CardContent class="flex flex-col gap-4">
			<div class="grid gap-4 md:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="brand">Brand *</Label>
					<Input id="brand" bind:value={formData.brand} placeholder="Toyota" required />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="model">Model *</Label>
					<Input id="model" bind:value={formData.model} placeholder="Camry" required />
				</div>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="year">Year</Label>
					<Input
						id="year"
						type="number"
						bind:value={formData.year}
						min="1900"
						max={new Date().getFullYear() + 1}
					/>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="color">Color</Label>
					<Input id="color" bind:value={formData.color} placeholder="Silver" />
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<Label for="vin">VIN</Label>
				<Input
					id="vin"
					bind:value={formData.vin}
					placeholder="1HGBH41JXMN109186"
					class="font-mono"
				/>
			</div>

			<div class="flex flex-col gap-2">
				<Label for="licensePlate">License Plate *</Label>
				<Input
					id="licensePlate"
					bind:value={formData.licensePlate}
					placeholder="ABC-1234"
					required
				/>
			</div>

			<div class="flex flex-col gap-2">
				<Label for="ownerName">Owner Name *</Label>
				<Input id="ownerName" bind:value={formData.ownerName} placeholder="John Doe" required />
			</div>

			<div class="flex flex-col gap-2">
				<Label for="ownerPhone">Owner Phone</Label>
				<Input
					id="ownerPhone"
					type="tel"
					bind:value={formData.ownerPhone}
					placeholder="+1 234 567 8900"
				/>
			</div>
		</CardContent>
		<CardFooter class="flex gap-2">
			<Button type="submit" class="flex-1" disabled={isSubmitting}>
				{isSubmitting ? 'Saving...' : car ? 'Update' : 'Add'} Car
			</Button>
			{#if onCancel}
				<Button
					type="button"
					variant="outline"
					class="flex-1"
					onclick={onCancel}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
			{/if}
		</CardFooter>
	</form>
</Card>
