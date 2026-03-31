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
	import {
		PlusIcon,
		Trash2Icon,
		ImageIcon,
		XIcon,
		ExternalLinkIcon,
		CameraIcon
	} from '@lucide/svelte';
	import {
		REPAIR_STATUS,
		USER_ROLE,
		STATUS_LABELS,
		SHOP_STATUS_TRANSITIONS,
		CUSTOMER_STATUS_TRANSITIONS,
		SHOP_CREATE_STATUSES,
		CUSTOMER_CREATE_STATUSES
	} from '$lib/constants';
	import type { RepairStatus } from '$lib/constants';
	import { untrack } from 'svelte';
	import type { Repair, RepairPart } from '$lib/types.js';

	let {
		carId,
		repair,
		onCancel,
		onSuccess,
		user,
		shopId: propShopId,
		shopMembers
	}: Props = $props();

	const isShopUser = $derived(
		user?.role === USER_ROLE.SHOP_OWNER || user?.role === USER_ROLE.MECHANIC
	);

	const allowedStatuses = $derived.by((): readonly RepairStatus[] => {
		if (!repair) {
			return isShopUser ? SHOP_CREATE_STATUSES : CUSTOMER_CREATE_STATUSES;
		}

		const current = repair.status;
		const transitions = isShopUser
			? SHOP_STATUS_TRANSITIONS[current]
			: CUSTOMER_STATUS_TRANSITIONS[current];

		if (transitions.length === 0) return [current];
		return [current, ...transitions];
	});

	const statusLocked = $derived(allowedStatuses.length <= 1);

	const repairs = useRepairs();

	let formData = $state(
		untrack(() => ({
			title: repair?.title || '',
			description: repair?.description || '',
			status:
				repair?.status ||
				(user?.role === USER_ROLE.SHOP_OWNER || user?.role === USER_ROLE.MECHANIC
					? REPAIR_STATUS.ESTIMATE_PENDING
					: REPAIR_STATUS.PENDING),
			shopId: repair?.shopId || propShopId || '',
			assignedMechanicId: repair?.assignedMechanicId || '',
			appointmentAt: repair?.appointmentAt
				? new Date(repair.appointmentAt).toISOString().slice(0, 16)
				: '',
			estimatedCost: repair?.estimatedCost || 0,
			estimatedHours: repair?.estimatedHours || 0,
			estimateNotes: repair?.estimateNotes || '',
			laborCost: repair?.laborCost || 0,
			laborHours: repair?.laborHours || 0,
			startDate: repair?.startDate
				? new Date(repair.startDate).toISOString().split('T')[0]
				: new Date().toISOString().split('T')[0],
			completedDate: repair?.completedDate
				? new Date(repair.completedDate).toISOString().split('T')[0]
				: ''
		}))
	);
	let parts = $state<RepairPart[]>(untrack(() => (repair?.parts ? [...repair.parts] : [])));
	let photos = $state<{ url: string; file?: File }[]>(
		untrack(() => (repair?.photos ? repair.photos.map((p) => ({ url: p.url })) : []))
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
		const input = e.target;
		if (!(input instanceof HTMLInputElement)) return;
		const files = input.files;
		if (!files) return;

		Array.from(files).forEach((file) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result;
				if (typeof result !== 'string') return;
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
				appointmentAt: formData.appointmentAt
					? new Date(formData.appointmentAt).toISOString()
					: undefined,
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
		user?: { role?: string | null; id?: string };
		shopId?: string;
		shopMembers?: Array<{ userId: string; userName: string | null; role: string }>;
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
					<Select type="single" bind:value={formData.status} disabled={statusLocked}>
						<SelectTrigger id="status"
							>{STATUS_LABELS[formData.status] ?? formData.status}</SelectTrigger
						>
						<SelectContent>
							{#each allowedStatuses as status (status)}
								<SelectItem value={status}>{STATUS_LABELS[status]}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			{#if isShopUser}
				<!-- Scheduling & Assignment for Shops -->
				<div class="space-y-4 rounded-lg bg-green-50 p-4 dark:bg-green-950">
					<h3 class="text-sm font-semibold">Scheduling & Assignment</h3>
					<div class="grid gap-4 md:grid-cols-2">
						<div class="flex flex-col gap-2">
							<Label for="appointmentAt">Appointment Date & Time</Label>
							<Input id="appointmentAt" type="datetime-local" bind:value={formData.appointmentAt} />
						</div>
						<div class="flex flex-col gap-2">
							<Label for="mechanicSelect">Assigned Mechanic</Label>
							{#if shopMembers && shopMembers.length > 0}
								<Select type="single" bind:value={formData.assignedMechanicId}>
									<SelectTrigger id="mechanicSelect">
										{#if formData.assignedMechanicId}
											{shopMembers.find((m) => m.userId === formData.assignedMechanicId)
												?.userName ?? 'Select mechanic'}
										{:else}
											Unassigned
										{/if}
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">Unassigned</SelectItem>
										{#each shopMembers as member (member.userId)}
											<SelectItem value={member.userId}>
												{member.userName ?? member.userId} ({member.role})
											</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							{:else}
								<Input
									id="mechanicId"
									bind:value={formData.assignedMechanicId}
									placeholder="Mechanic user ID"
								/>
							{/if}
						</div>
					</div>
				</div>

				<!-- Estimate Section for Shops -->
				<div class="space-y-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
					<h3 class="text-sm font-semibold">Estimate Details</h3>
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
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					{#each photos as photo, index (index)}
						<div class="group relative aspect-square overflow-hidden rounded-lg border">
							<img
								src={photo.url}
								alt="Repair photo {index + 1}"
								class="h-full w-full object-cover"
							/>
							<button
								type="button"
								onclick={() => removePhoto(index)}
								class="text-destructive-foreground absolute top-2 right-2 rounded-full bg-destructive p-1 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<XIcon class="size-4" />
							</button>
						</div>
					{/each}
					<label
						class="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:bg-accent"
					>
						<CameraIcon class="mb-1 size-8 text-muted-foreground" />
						<span class="text-xs text-muted-foreground">Camera</span>
						<input
							type="file"
							accept="image/*"
							capture="environment"
							onchange={handlePhotoUpload}
							class="hidden"
						/>
					</label>
					<label
						class="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:bg-accent"
					>
						<ImageIcon class="mb-1 size-8 text-muted-foreground" />
						<span class="text-xs text-muted-foreground">Gallery</span>
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
						<div class="flex flex-col gap-2 rounded-lg border p-3">
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1">
									<p class="font-medium">{part.name}</p>
									{#if part.description}
										<p class="text-sm text-muted-foreground">{part.description}</p>
									{/if}
									<p class="mt-1 text-sm text-muted-foreground">
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
								<!-- eslint-disable svelte/no-navigation-without-resolve -- external URL -->
								<a
									href={part.sourceUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-1 text-xs text-primary hover:underline"
								>
									<ExternalLinkIcon class="size-3" />
									View source
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{/if}
						</div>
					{/each}
				</div>

				<div class="flex flex-col gap-2 rounded-lg bg-muted p-4">
					<div class="grid gap-2">
						<Input bind:value={newPart.name} placeholder="Part name *" />
						<Textarea
							bind:value={newPart.description}
							placeholder="Description (optional)"
							rows={2}
						/>
						<Input bind:value={newPart.sourceUrl} placeholder="Source URL (optional)" type="url" />
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
							<Input
								type="number"
								bind:value={newPart.quantity}
								min="1"
								placeholder="Qty"
								inputmode="numeric"
							/>
							<Input
								type="number"
								bind:value={newPart.unitCost}
								min="0"
								step="0.01"
								placeholder="Unit cost"
								inputmode="decimal"
							/>
							<Button type="button" onclick={addPart} class="col-span-2 w-full sm:col-span-1">
								<PlusIcon />
								Add Part
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-2 rounded-lg bg-muted p-4">
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
				<div class="flex justify-between border-t pt-2 text-lg font-bold">
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
