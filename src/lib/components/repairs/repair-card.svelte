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
	import { Button } from '$lib/components/ui/button';
	import RepairForm from './repair-form.svelte';
	import EstimateApprovalCard from './estimate-approval-card.svelte';
	import PaymentForm from './payment-form.svelte';
	import {
		EditIcon,
		Trash2Icon,
		CalendarIcon,
		DollarSignIcon,
		PackageIcon,
		ClockIcon,
		ExternalLinkIcon,
		CalendarClockIcon,
		UserIcon
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';
	import { REPAIR_STATUS, STATUS_COLORS, STATUS_LABELS } from '$lib/constants';
	import type { Repair } from '$lib/types.js';

	let { repair }: Props = $props();

	const repairs = useRepairs();
	let showEditForm = $state(false);
	let showPhotos = $state(false);

	const handleDelete = () => {
		if (confirm('Are you sure you want to delete this repair?')) {
			repairs.deleteRepair(repair.id);
			toast.success('Repair deleted successfully');
		}
	};

	function handleWorkflowAction() {
		repairs.loadData();
	}

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const hourlyRate = $derived(repair.laborHours > 0 ? repair.laborCost / repair.laborHours : 0);

	const showEstimate = $derived(
		repair.status === REPAIR_STATUS.ESTIMATE_PENDING ||
			repair.status === REPAIR_STATUS.ESTIMATE_APPROVED
	);

	const showPayment = $derived(
		(repair.status === REPAIR_STATUS.COMPLETED || repair.status === REPAIR_STATUS.PAID) &&
			repair.totalCost > 0
	);

	type Props = {
		repair: Repair;
	};
</script>

<Card>
	{#if showEditForm}
		<div transition:fly={{ y: -20, duration: 300 }}>
			<RepairForm
				carId={repair.carId}
				{repair}
				onCancel={() => (showEditForm = false)}
				onSuccess={() => (showEditForm = false)}
			/>
		</div>
	{:else}
		<CardHeader>
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1">
					<div class="mb-2 flex items-center gap-2">
						<CardTitle>{repair.title}</CardTitle>
						<Badge variant={STATUS_COLORS[repair.status]}>{STATUS_LABELS[repair.status]}</Badge>
					</div>
					<CardDescription>{repair.description}</CardDescription>
				</div>
				<div class="flex gap-2">
					<Button variant="ghost" size="icon" onclick={() => (showEditForm = true)}>
						<EditIcon class="size-4" />
					</Button>
					<Button variant="ghost" size="icon" onclick={handleDelete}>
						<Trash2Icon class="size-4" />
					</Button>
				</div>
			</div>
		</CardHeader>
		<CardContent class="flex flex-col gap-4">
			{#if repair.appointmentAt || repair.assignedMechanicId}
				<div class="flex flex-wrap gap-3 text-sm">
					{#if repair.appointmentAt}
						<div class="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 dark:bg-blue-950">
							<CalendarClockIcon class="size-4 text-blue-600 dark:text-blue-400" />
							<span>
								{new Date(repair.appointmentAt).toLocaleString('en-US', {
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: '2-digit'
								})}
							</span>
						</div>
					{/if}
					{#if repair.assignedMechanic}
						<div
							class="flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 dark:bg-green-950"
						>
							<UserIcon class="size-4 text-green-600 dark:text-green-400" />
							<span>{repair.assignedMechanic.name ?? repair.assignedMechanic.email}</span>
						</div>
					{:else if repair.assignedMechanicId}
						<div
							class="flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 dark:bg-green-950"
						>
							<UserIcon class="size-4 text-green-600 dark:text-green-400" />
							<span>Mechanic assigned</span>
						</div>
					{/if}
				</div>
			{/if}

			{#if repair.photos && repair.photos.length > 0}
				<div>
					<button
						type="button"
						onclick={() => (showPhotos = !showPhotos)}
						class="mb-2 text-sm font-medium hover:underline"
					>
						{showPhotos ? 'Hide' : 'Show'} Photos ({repair.photos.length})
					</button>
					{#if showPhotos}
						<div
							class="grid grid-cols-2 gap-2 md:grid-cols-4"
							transition:fly={{ y: -10, duration: 200 }}
						>
							{#each repair.photos as photo, index (index)}
								<div class="aspect-square overflow-hidden rounded-lg border">
									<img
										src={photo.url}
										alt="Repair photo {index + 1}"
										class="h-full w-full object-cover"
									/>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if repair.parts.length > 0}
				<div class="flex flex-col gap-2">
					<div class="flex items-center gap-2 text-sm font-medium">
						<PackageIcon class="size-4" />
						<span>Parts Used</span>
					</div>
					<div class="flex flex-col gap-2">
						{#each repair.parts as part (part.id)}
							<div class="flex flex-col gap-1 rounded-lg bg-muted p-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<p class="font-medium">{part.name}</p>
										{#if part.description}
											<p class="text-xs text-muted-foreground">{part.description}</p>
										{/if}
									</div>
									<span class="font-medium">${part.totalCost.toFixed(2)}</span>
								</div>
								<div class="flex items-center justify-between text-xs text-muted-foreground">
									<span>{part.quantity} × ${part.unitCost.toFixed(2)}</span>
									{#if part.sourceUrl}
										<!-- eslint-disable svelte/no-navigation-without-resolve -- external URL -->
										<a
											href={part.sourceUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="flex items-center gap-1 text-primary hover:underline"
										>
											<ExternalLinkIcon class="size-3" />
											Source
										</a>
										<!-- eslint-enable svelte/no-navigation-without-resolve -->
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex flex-wrap gap-4 text-sm">
				<div class="flex items-center gap-2">
					<CalendarIcon class="size-4 text-muted-foreground" />
					<span>{formatDate(repair.startDate)}</span>
					{#if repair.completedDate}
						<span class="text-muted-foreground">→ {formatDate(repair.completedDate)}</span>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<DollarSignIcon class="size-4 text-muted-foreground" />
					<span class="font-medium">${repair.totalCost.toFixed(2)}</span>
				</div>
				{#if repair.laborHours > 0}
					<div class="flex items-center gap-2">
						<ClockIcon class="size-4 text-muted-foreground" />
						<span>{repair.laborHours}h @ ${hourlyRate.toFixed(2)}/hr</span>
					</div>
				{:else if repair.laborCost > 0}
					<div class="flex items-center gap-2">
						<ClockIcon class="size-4 text-muted-foreground" />
						<span>Labor: ${repair.laborCost.toFixed(2)}</span>
					</div>
				{/if}
			</div>
		</CardContent>
	{/if}
</Card>

{#if showEstimate}
	<EstimateApprovalCard {repair} onApprove={handleWorkflowAction} />
{/if}

{#if showPayment}
	<PaymentForm {repair} onPaymentRecorded={handleWorkflowAction} />
{/if}
