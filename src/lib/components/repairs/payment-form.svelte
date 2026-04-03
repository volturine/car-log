<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { DollarSign, CreditCard, ReceiptText } from '@lucide/svelte';
	import { formatCurrency } from '$lib/utils';
	import { PAYMENT_METHOD, PAYMENT_METHOD_LABELS } from '$lib/constants';
	import { toast } from 'svelte-sonner';
	import type { Payment, PaymentMethod, Repair } from '$lib/types';

	let { repair, onPaymentRecorded }: { repair: Repair; onPaymentRecorded?: () => void } = $props();

	let amount = $state(0);
	let method = $state<PaymentMethod>('cash');
	let notes = $state('');
	let isSubmitting = $state(false);
	let recorded = $state<Payment[]>([]);
	const localPayments = $derived([...(repair.payments ?? []), ...recorded]);

	const remainingBalance = $derived(repair.totalCost - (repair.amountPaid || 0));
	const isFullyPaid = $derived(remainingBalance <= 0);

	function formatMethodLabel(value: PaymentMethod): string {
		return PAYMENT_METHOD_LABELS[value] ?? value;
	}

	function parsePaymentMethod(value: string): PaymentMethod | null {
		if (value === PAYMENT_METHOD.CASH) return PAYMENT_METHOD.CASH;
		if (value === PAYMENT_METHOD.CARD) return PAYMENT_METHOD.CARD;
		if (value === PAYMENT_METHOD.CHECK) return PAYMENT_METHOD.CHECK;
		if (value === PAYMENT_METHOD.TRANSFER) return PAYMENT_METHOD.TRANSFER;
		if (value === PAYMENT_METHOD.OTHER) return PAYMENT_METHOD.OTHER;
		return null;
	}

	function formatDateTime(date: string | Date): string {
		const value = typeof date === 'string' ? new Date(date) : date;
		if (Number.isNaN(value.getTime())) return '';
		return value.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function setFullAmount() {
		amount = remainingBalance;
	}

	async function recordPayment() {
		if (amount <= 0) {
			toast.error('Please enter a valid payment amount');
			return;
		}

		if (amount > remainingBalance) {
			toast.error('Payment amount exceeds remaining balance');
			return;
		}

		isSubmitting = true;
		try {
			const response = await fetch(`/api/repairs/${repair.id}/payment`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount, method, notes })
			});

			if (!response.ok) {
				throw new Error('Failed to record payment');
			}

			const result = await response.json();
			const details = result.data?.payment ?? result.payment;

			if (details) {
				recorded = [
					...recorded,
					{
						id: details.id,
						repairId: repair.id,
						amount: details.amount,
						method: details.method,
						notes: details.notes,
						recordedBy: details.recordedBy,
						paidAt: details.paidAt,
						createdAt: details.createdAt
					}
				];
			}

			const newBalance = remainingBalance - amount;
			toast.success(
				newBalance <= 0
					? 'Payment recorded! Repair fully paid.'
					: `Payment recorded! Remaining: ${formatCurrency(newBalance)}`
			);

			amount = 0;
			method = 'cash';
			notes = '';

			onPaymentRecorded?.();
		} catch (err) {
			console.error('Failed to record payment:', err);
			toast.error('Failed to record payment');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<DollarSign class="h-5 w-5" />
			Payment Tracking
		</CardTitle>
		<CardDescription>Record payments received for this repair</CardDescription>
	</CardHeader>

	<CardContent class="space-y-4">
		<div class="grid gap-2 rounded-lg bg-muted/50 p-4">
			<div class="flex items-center justify-between">
				<span class="text-sm text-muted-foreground">Total Cost:</span>
				<span class="font-semibold">{formatCurrency(repair.totalCost)}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm text-muted-foreground">Amount Paid:</span>
				<span class="font-medium text-green-600 dark:text-green-400">
					{formatCurrency(repair.amountPaid || 0)}
				</span>
			</div>
			<div class="flex items-center justify-between border-t pt-2">
				<span class="text-sm font-medium">Remaining Balance:</span>
				<span class="text-lg font-bold {isFullyPaid ? 'text-green-600 dark:text-green-400' : ''}">
					{formatCurrency(remainingBalance)}
				</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm text-muted-foreground">Payment Status:</span>
				<span
					class="text-sm font-medium capitalize {repair.paymentStatus === 'paid'
						? 'text-green-600 dark:text-green-400'
						: repair.paymentStatus === 'partial'
							? 'text-yellow-600 dark:text-yellow-400'
							: 'text-red-600 dark:text-red-400'}"
				>
					{repair.paymentStatus || 'unpaid'}
				</span>
			</div>
		</div>

		{#if localPayments.length > 0}
			<Separator />
			<div class="space-y-3">
				<div class="flex items-center gap-2 text-sm font-medium">
					<ReceiptText class="size-4" />
					<span>Payment History</span>
					<Badge variant="secondary" class="ml-auto">{localPayments.length}</Badge>
				</div>
				<div class="flex flex-col gap-2">
					{#each localPayments as entry, i (i)}
						<div class="rounded-lg bg-muted p-3">
							<div class="flex items-start justify-between">
								<div class="flex flex-col gap-0.5">
									<span class="text-sm font-medium">
										{formatCurrency(entry.amount)}
									</span>
									<span class="text-xs text-muted-foreground">
										{formatMethodLabel(entry.method)}
									</span>
								</div>
								<span class="text-xs text-muted-foreground">
									{formatDateTime(entry.paidAt)}
								</span>
							</div>
							{#if entry.notes}
								<p class="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if !isFullyPaid}
			<Separator />
			<form
				onsubmit={(e: Event) => {
					e.preventDefault();
					recordPayment();
				}}
				class="space-y-4"
			>
				<div class="space-y-2">
					<Label for="amount">Payment Amount *</Label>
					<div class="flex gap-2">
						<div class="relative flex-1">
							<span class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
							<Input
								id="amount"
								type="number"
								bind:value={amount}
								min="0"
								max={remainingBalance}
								step="0.01"
								class="pl-7"
								placeholder="0.00"
								required
							/>
						</div>
						<Button type="button" variant="outline" onclick={setFullAmount}>Full Amount</Button>
					</div>
					<p class="text-xs text-muted-foreground">
						Maximum: {formatCurrency(remainingBalance)}
					</p>
				</div>

				<div class="space-y-2">
					<Label for="method">Payment Method</Label>
					<Select
						type="single"
						onValueChange={(value: string) => {
							const next = parsePaymentMethod(value);
							if (next) method = next;
						}}
						value={method}
					>
						<SelectTrigger id="method">
							{formatMethodLabel(method)}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="cash">Cash</SelectItem>
							<SelectItem value="card">Credit/Debit Card</SelectItem>
							<SelectItem value="check">Check</SelectItem>
							<SelectItem value="transfer">Bank Transfer</SelectItem>
							<SelectItem value="other">Other</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div class="space-y-2">
					<Label for="notes">Notes (Optional)</Label>
					<Textarea
						id="notes"
						bind:value={notes}
						placeholder="Transaction ID, check number, or other details..."
						rows={2}
					/>
				</div>

				<Button type="submit" class="w-full" disabled={isSubmitting || amount <= 0}>
					<CreditCard class="mr-2 h-4 w-4" />
					{isSubmitting ? 'Recording...' : `Record Payment of ${formatCurrency(amount)}`}
				</Button>
			</form>
		{:else}
			<div class="py-4 text-center text-green-600 dark:text-green-400">
				<CreditCard class="mx-auto mb-2 h-12 w-12" />
				<p class="font-semibold">Fully Paid</p>
				<p class="text-sm text-muted-foreground">This repair has been paid in full</p>
			</div>
		{/if}
	</CardContent>
</Card>
