<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { REPAIR_STATUS, STATUS_LABELS, type RepairStatus } from '$lib/constants';
	import { toast } from 'svelte-sonner';
	import { PlayIcon, CheckCircleIcon, ClipboardListIcon } from '@lucide/svelte';
	import type { Repair } from '$lib/types';
	import type { Component } from 'svelte';

	const QUICK_ADVANCE: Partial<Record<RepairStatus, RepairStatus>> = {
		[REPAIR_STATUS.ESTIMATE_APPROVED]: REPAIR_STATUS.IN_PROGRESS,
		[REPAIR_STATUS.ESTIMATE_REJECTED]: REPAIR_STATUS.ESTIMATE_PENDING,
		[REPAIR_STATUS.IN_PROGRESS]: REPAIR_STATUS.COMPLETED
	};

	let { repair, onadvance }: { repair: Repair; onadvance: () => void } = $props();

	let advancing = $state(false);

	const target = $derived<RepairStatus | null>(QUICK_ADVANCE[repair.status] ?? null);

	function iconFor(status: RepairStatus): Component<{ class?: string }> {
		if (status === REPAIR_STATUS.IN_PROGRESS) return PlayIcon;
		if (status === REPAIR_STATUS.COMPLETED) return CheckCircleIcon;
		if (status === REPAIR_STATUS.ESTIMATE_PENDING) return ClipboardListIcon;
		return PlayIcon;
	}

	const icon = $derived(target ? iconFor(target) : null);
	const label = $derived(target ? STATUS_LABELS[target] : null);

	async function advance() {
		if (!target) return;
		advancing = true;
		const response = await fetch(`/api/repairs/${repair.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: target })
		});
		advancing = false;
		if (!response.ok) {
			toast.error('Failed to advance status');
			return;
		}
		toast.success(`Moved to ${STATUS_LABELS[target]}`);
		onadvance();
	}
</script>

{#if target && icon}
	<Tooltip>
		<TooltipTrigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="outline"
					size="icon"
					class="size-8 shrink-0"
					disabled={advancing}
					onclick={(e: MouseEvent) => {
						e.stopPropagation();
						advance();
					}}
				>
					{#if advancing}
						<span
							class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						></span>
					{:else}
						{@const Icon = icon}
						<Icon class="size-4" />
					{/if}
				</Button>
			{/snippet}
		</TooltipTrigger>
		<TooltipContent>
			<p>Move to {label}</p>
		</TooltipContent>
	</Tooltip>
{/if}
