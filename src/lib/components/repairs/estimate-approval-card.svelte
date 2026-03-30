<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { CheckCircle2, XCircle, Clock, DollarSign } from '@lucide/svelte';
	import { formatCurrency } from '$lib/utils/helpers';
	import { toast } from 'svelte-sonner';
	import type { Repair } from '$lib/types';

	let { repair, onApprove }: { repair: Repair; onApprove?: () => void } = $props();

	let isApproving = $state(false);
	let isRejecting = $state(false);
	let showRejectForm = $state(false);
	let rejectReason = $state('');

	let isPending = $derived(repair.status === 'estimate_pending');
	let isApproved = $derived(repair.status === 'estimate_approved' || repair.customerApproved);

	async function approveEstimate() {
		isApproving = true;
		try {
			const response = await fetch(`/api/repairs/${repair.id}/approve`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to approve estimate');
			}

			toast.success('Estimate approved! The shop can now begin work.');
			onApprove?.();
		} catch (error) {
			console.error('Failed to approve estimate:', error);
			toast.error('Failed to approve estimate');
		} finally {
			isApproving = false;
		}
	}

	async function rejectEstimate() {
		if (!rejectReason.trim()) {
			toast.error('Please provide a reason for rejection');
			return;
		}

		isRejecting = true;
		try {
			const response = await fetch(`/api/repairs/${repair.id}/reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: rejectReason })
			});

			if (!response.ok) {
				throw new Error('Failed to reject estimate');
			}

			toast.success('Estimate rejected. The shop has been notified.');
			showRejectForm = false;
			onApprove?.();
		} catch (error) {
			console.error('Failed to reject estimate:', error);
			toast.error('Failed to reject estimate');
		} finally {
			isRejecting = false;
		}
	}
</script>

<Card class={isPending ? 'border-blue-500 border-2' : ''}>
	<CardHeader>
		<div class="flex items-start justify-between">
			<div>
				<CardTitle class="flex items-center gap-2">
					{#if isPending}
						<Clock class="h-5 w-5 text-blue-500" />
					{:else if isApproved}
						<CheckCircle2 class="h-5 w-5 text-green-500" />
					{:else}
						<XCircle class="h-5 w-5 text-red-500" />
					{/if}
					Repair Estimate
				</CardTitle>
				<CardDescription>
					{#if isPending}
						Review and approve this estimate to proceed
					{:else if isApproved}
						Estimate approved on {new Date(repair.approvedAt || '').toLocaleDateString()}
					{:else}
						Estimate status: {repair.status}
					{/if}
				</CardDescription>
			</div>
			{#if isPending}
				<Badge class="bg-blue-500">Pending Approval</Badge>
			{:else if isApproved}
				<Badge class="bg-green-500">Approved</Badge>
			{/if}
		</div>
	</CardHeader>

	<CardContent class="space-y-4">
		<!-- Estimate Details -->
		<div class="grid gap-3 p-4 bg-muted/50 rounded-lg">
			<div class="flex items-center justify-between">
				<span class="text-sm text-muted-foreground">Estimated Cost:</span>
				<span class="font-semibold text-lg">{formatCurrency(repair.estimatedCost || 0)}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm text-muted-foreground">Estimated Hours:</span>
				<span class="font-medium">{repair.estimatedHours || 0}h</span>
			</div>
			{#if repair.estimateNotes}
				<div class="pt-2 border-t">
					<span class="text-sm font-medium">Notes:</span>
					<p class="text-sm text-muted-foreground mt-1">{repair.estimateNotes}</p>
				</div>
			{/if}
		</div>

		<!-- Parts Breakdown -->
		{#if repair.parts && repair.parts.length > 0}
			<div>
				<h4 class="text-sm font-medium mb-2">Parts Breakdown:</h4>
				<div class="space-y-2">
					{#each repair.parts as part}
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">
								{part.quantity}× {part.name}
							</span>
							<span class="font-medium">{formatCurrency(part.totalCost)}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Approval Actions -->
		{#if isPending && !showRejectForm}
			<div class="flex gap-2 pt-2">
				<Button onclick={approveEstimate} disabled={isApproving} class="flex-1">
					<CheckCircle2 class="h-4 w-4 mr-2" />
					{isApproving ? 'Approving...' : 'Approve Estimate'}
				</Button>
				<Button variant="outline" onclick={() => (showRejectForm = true)} disabled={isApproving} class="flex-1">
					<XCircle class="h-4 w-4 mr-2" />
					Reject
				</Button>
			</div>
		{/if}

		<!-- Reject Form -->
		{#if showRejectForm && isPending}
			<div class="space-y-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
				<div class="space-y-2">
					<Label for="rejectReason">Reason for Rejection</Label>
					<Textarea
						id="rejectReason"
						bind:value={rejectReason}
						placeholder="Please explain why you're rejecting this estimate..."
						rows={3}
					/>
				</div>
				<div class="flex gap-2">
					<Button
						variant="destructive"
						onclick={rejectEstimate}
						disabled={isRejecting || !rejectReason.trim()}
						class="flex-1"
					>
						{isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
					</Button>
					<Button variant="outline" onclick={() => (showRejectForm = false)} disabled={isRejecting}>
						Cancel
					</Button>
				</div>
			</div>
		{/if}
	</CardContent>
</Card>
