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
	import { Textarea } from '$lib/components/ui/textarea';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import { PlusIcon, Trash2Icon, ImageIcon, XIcon, ExternalLinkIcon } from '@lucide/svelte';
	import { REPAIR_STATUS, USER_ROLE } from '$lib/constants';
	import type { Repair, RepairPart, RepairStatus } from '$lib/types.js';

	let { carId, repair, onCancel, onSuccess, user }: Props = $props();

	let isShopUser = $derived(
		user?.role === USER_ROLE.SHOP_OWNER || user?.role === USER_ROLE.MECHANIC
	);

	const repairs = useRepairs();

	function initFormData() {
		return {
			title: repair?.title || '',
			description: repair?.description || '',
			status: repair?.status || (isShopUser ? REPAIR_STATUS.ESTIMATE_PENDING : 'pending' as RepairStatus),
			shopId: repair?.shopId || '',
			assignedMechanicId: repair?.assignedMechanicId || '',
			// Estimate fields
			estimatedCost: repair?.estimatedCost || 0,
			estimatedHours: repair?.estimatedHours || 0,
			estimateNotes: repair?.estimateNotes || '',
			// Actual fields
			laborCost: repair?.laborCost || 0,
			laborHours: repair?.laborHours || 0,
			startDate: repair?.startDate
				? new Date(repair.startDate).toISOString().split('T')[0]
				: new Date().toISOString().split('T')[0],
			completedDate: repair?.completedDate
				? new Date(repair.completedDate).toISOString().split('T')[0]
				: ''
		};
	}

	let formData = $state(initFormData());
	let parts = $state<RepairPart[]>(repair?.parts ? [...repair.parts] : []);
	let photos = $state<{ url: string; file?: File }[]>(
		repair?.photos ? repair.photos.map((p: any) => ({ url: p.url || p })) : []
	);
	let newPart = $state({ name: '', description: '', quantity: 1, unitCost: 0, sourceUrl: '' });
	let isSubmitting = $state(false);

	const addPart = () => {
		if (!newPart.name || newPart.unitCost <= 0) {
			toast.error('Please enter part name and cost');
			return;
		}

		const part: RepairPart = {
			id: crypto.randomUUID(),
			name: newPart.name,
			description: newPart.description,
			quantity: newPart.quantity,
			unitCost: newPart.unitCost,
			totalCost: newPart.quantity * newPart.unitCost,
			sourceUrl: newPart.sourceUrl
		};

		parts = [...parts, part];
		newPart = { name: '', description: '', quantity: 1, unitCost: 0, sourceUrl: '' };
	};

	const removePart = (id: string) => {
		parts = parts.filter((p) => p.id !== id);
	};

	const handlePhotoUpload = (e: Event) => {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (!files) return;

		Array.from(files).forEach((file) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				photos = [...photos, { url: result, file }];
			};
			reader.readAsDataURL(file);
		});
	};

	const removePhoto = (index: number) => {
		photos = photos.filter((_, i) => i !== index);
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!formData.title || !formData.description) {
			toast.error('Please fill in all required fields');
			return;
		}

		if (isSubmitting) return;
		isSubmitting = true;

		try {
			const repairData = {
				carId,
				title: formData.title,
				description: formData.description,
				status: formData.status,
				parts,
				// Shop fields
				shopId: formData.shopId || undefined,
				assignedMechanicId: formData.assignedMechanicId || undefined,
				// Estimate fields
				estimatedCost: formData.estimatedCost,
				estimatedHours: formData.estimatedHours,
				estimateNotes: formData.estimateNotes || undefined,
				// Actual fields
				laborCost: formData.laborCost,
				laborHours: formData.laborHours,
				startDate: new Date(formData.startDate),
				completedDate: formData.completedDate ? new Date(formData.completedDate) : undefined
			};

			let repairId: string;
			if (repair) {
				await repairs.updateRepair(repair.id, repairData);
				repairId = repair.id;
			} else {
				repairId = await repairs.addRepair(repairData);
			}

			// Upload new photos
			const newPhotos = photos.filter((p) => p.file);
			if (newPhotos.length > 0 && repairId) {
				await repairs.uploadPhotos(
					repairId,
					newPhotos.map((p) => p.file!)
				);
			}

			onSuccess?.();
		} catch (error) {
			console.error('Failed to submit repair:', error);
		} finally {
			isSubmitting = false;
		}
	};

	const totalPartsCost = $derived(parts.reduce((sum, p) => sum + p.totalCost, 0));
	const totalCost = $derived(totalPartsCost + formData.laborCost);
	const hourlyRate = $derived(
		formData.laborHours > 0 ? formData.laborCost / formData.laborHours : 0
	);

	type Props = {
		carId: string;
		repair?: Repair;
		onCancel?: () => void;
		onSuccess?: () => void;
		user?: { role?: string; id?: string };
	};
</script>

<Card>
	<form onsubmit={handleSubmit}>
		<CardHeader>
			<CardTitle>{repair ? 'Edit Repair' : 'New Repair'}</CardTitle>
			<CardDescription>Document the repair details</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			<div class="flex flex-col gap-2">
				<Label for="title">Title *</Label>
				<Input
					id="title"
					bind:value={formData.title}
					placeholder="Brake pad replacement"
					required
				/>
			</div>

			<div class="flex flex-col gap-2">
				<Label for="description">Description *</Label>
				<Textarea
					id="description"
					bind:value={formData.description}
					placeholder="Detailed description of the problem and repair..."
					rows={4}
					required
				/>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="status">Status</Label>
					<Select type="single" bind:value={formData.status}>
						<SelectTrigger id="status">{formData.status}</SelectTrigger>
						<SelectContent>
							{#if isShopUser}
								<SelectItem value={REPAIR_STATUS.ESTIMATE_PENDING}>Estimate Pending</SelectItem>
								<SelectItem value={REPAIR_STATUS.ESTIMATE_APPROVED}>Estimate Approved</SelectItem>
								<SelectItem value={REPAIR_STATUS.IN_PROGRESS}>In Progress</SelectItem>
								<SelectItem value={REPAIR_STATUS.COMPLETED}>Completed</SelectItem>
								<SelectItem value={REPAIR_STATUS.PAID}>Paid</SelectItem>
							{:else}
								<SelectItem value="pending">Pending</SelectItem>
								<SelectItem value="in_progress">In Progress</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
							{/if}
						</SelectContent>
					</Select>
				</div>
			</div>

			{#if isShopUser}
				<!-- Estimate Section for Shops -->
				<div class="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-4">
					<h3 class="font-semibold text-sm">Estimate Details</h3>
					<div class="grid gap-4 md:grid-cols-2">
						<div class="flex flex-col gap-2">
							<Label for="estimatedCost">Estimated Cost ($)</Label>
							<Input
								id="estimatedCost"
								type="number"
								bind:value={formData.estimatedCost}
								min="0"
								step="0.01"
							/>
						</div>
						<div class="flex flex-col gap-2">
							<Label for="estimatedHours">Estimated Hours</Label>
							<Input
								id="estimatedHours"
								type="number"
								bind:value={formData.estimatedHours}
								min="0"
								step="0.5"
							/>
						</div>
					</div>
					<div class="flex flex-col gap-2">
						<Label for="estimateNotes">Estimate Notes</Label>
						<Textarea
							id="estimateNotes"
							bind:value={formData.estimateNotes}
							placeholder="Notes about the estimate for the customer..."
							rows={2}
						/>
					</div>
				</div>
			{/if}

			<!-- Actual Work Section -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="laborHours">{isShopUser ? 'Actual ' : ''}Labor Hours</Label>
					<Input
						id="laborHours"
						type="number"
						bind:value={formData.laborHours}
						min="0"
						step="0.5"
					/>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="laborCost">{isShopUser ? 'Actual ' : ''}Labor Cost ($)</Label>
					<Input id="laborCost" type="number" bind:value={formData.laborCost} min="0" step="0.01" />
					{#if hourlyRate > 0}
						<p class="text-xs text-muted-foreground">Hourly rate: ${hourlyRate.toFixed(2)}/hr</p>
					{/if}
				</div>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="startDate">Start Date</Label>
					<Input id="startDate" type="date" bind:value={formData.startDate} />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="completedDate">Completed Date</Label>
					<Input id="completedDate" type="date" bind:value={formData.completedDate} />
				</div>
			</div>

			<div class="flex flex-col gap-4">
				<Label>Photos</Label>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					{#each photos as photo, index (index)}
						<div class="relative group aspect-square rounded-lg overflow-hidden border">
							<img src={photo.url} alt="Repair photo {index + 1}" class="w-full h-full object-cover" />
							<button
								type="button"
								onclick={() => removePhoto(index)}
								class="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<XIcon class="size-4" />
							</button>
						</div>
					{/each}
					<label
						class="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors"
					>
						<ImageIcon class="size-8 text-muted-foreground mb-2" />
						<span class="text-sm text-muted-foreground">Add Photo</span>
						<input
							type="file"
							accept="image/*"
							multiple
							onchange={handlePhotoUpload}
							class="hidden"
						/>
					</label>
				</div>
			</div>

			<div class="flex flex-col gap-4">
				<Label>Parts & Materials</Label>
				<div class="flex flex-col gap-2">
					{#each parts as part (part.id)}
						<div class="flex flex-col gap-2 p-3 border rounded-lg">
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1">
									<p class="font-medium">{part.name}</p>
									{#if part.description}
										<p class="text-sm text-muted-foreground">{part.description}</p>
									{/if}
									<p class="text-sm text-muted-foreground mt-1">
										{part.quantity} × ${part.unitCost.toFixed(2)} = ${part.totalCost.toFixed(2)}
									</p>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onclick={() => removePart(part.id)}
								>
									<Trash2Icon class="size-4" />
								</Button>
							</div>
							{#if part.sourceUrl}
								<a
									href={part.sourceUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-1 text-xs text-primary hover:underline"
								>
									<ExternalLinkIcon class="size-3" />
									View source
								</a>
							{/if}
						</div>
					{/each}
				</div>

				<div class="flex flex-col gap-2 p-4 bg-muted rounded-lg">
					<div class="grid gap-2">
						<Input bind:value={newPart.name} placeholder="Part name *" />
						<Textarea
							bind:value={newPart.description}
							placeholder="Description (optional)"
							rows={2}
						/>
						<Input bind:value={newPart.sourceUrl} placeholder="Source URL (optional)" type="url" />
						<div class="grid grid-cols-3 gap-2">
							<Input type="number" bind:value={newPart.quantity} min="1" placeholder="Qty" />
							<Input
								type="number"
								bind:value={newPart.unitCost}
								min="0"
								step="0.01"
								placeholder="Unit cost"
							/>
							<Button type="button" onclick={addPart} class="w-full">
								<PlusIcon />
								Add
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div class="p-4 bg-muted rounded-lg flex flex-col gap-2">
				<div class="flex justify-between text-sm">
					<span>Parts Total:</span>
					<span class="font-medium">${totalPartsCost.toFixed(2)}</span>
				</div>
				<div class="flex justify-between text-sm">
					<span>Labor Cost:</span>
					<span class="font-medium">${formData.laborCost.toFixed(2)}</span>
				</div>
				{#if formData.laborHours > 0}
					<div class="flex justify-between text-xs text-muted-foreground">
						<span>({formData.laborHours}h @ ${hourlyRate.toFixed(2)}/hr)</span>
					</div>
				{/if}
				<div class="flex justify-between text-lg font-bold pt-2 border-t">
					<span>Total Cost:</span>
					<span>${totalCost.toFixed(2)}</span>
				</div>
			</div>
		</CardContent>
		<CardFooter class="flex gap-2">
			<Button type="submit" class="flex-1" disabled={isSubmitting}>
				{isSubmitting ? 'Saving...' : repair ? 'Update' : 'Add'} Repair
			</Button>
			{#if onCancel}
				<Button type="button" variant="outline" class="flex-1" onclick={onCancel} disabled={isSubmitting}>
					Cancel
				</Button>
			{/if}
		</CardFooter>
	</form>
</Card>
