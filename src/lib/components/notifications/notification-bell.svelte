<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Bell,
		ExternalLinkIcon,
		CheckIcon,
		XIcon,
		CheckCheckIcon,
		TriangleAlertIcon
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Sheet,
		SheetContent,
		SheetDescription,
		SheetHeader,
		SheetTitle,
		SheetTrigger
	} from '$lib/components/ui/sheet';
	import { formatDateTime, formatRelativeTime } from '$lib/utils';

	type Notification = {
		id: string;
		type: string;
		title: string;
		message: string;
		read: boolean;
		createdAt: string;
		relatedId?: string;
		relatedType?: string;
		carId?: string | null;
	};

	let notifications = $state<Notification[]>([]);
	const unreadCount = $derived(notifications.filter((n) => !n.read).length);
	let loading = $state(false);
	let actionLoading = $state(false);
	let open = $state(false);
	let mode = $state<'all' | 'unread'>('all');

	const sorted = $derived.by(() => {
		return notifications.toSorted((a, b) => {
			if (a.read !== b.read) {
				return a.read ? 1 : -1;
			}

			const aRank = getRank(a.type);
			const bRank = getRank(b.type);

			if (aRank !== bRank) {
				return aRank - bRank;
			}

			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});
	});

	const listed = $derived(mode === 'unread' ? sorted.filter((n) => !n.read) : sorted);

	const urgent = $derived(sorted.filter((n) => !n.read && getRank(n.type) <= 1).slice(0, 3));

	const canMarkAll = $derived(unreadCount > 0);

	async function loadNotifications() {
		loading = true;
		const response = await fetch('/api/notifications').catch(() => null);
		if (response?.ok) {
			const result = await response.json();
			notifications = result.data || result;
		}
		loading = false;
	}

	async function markAsRead(id: string) {
		const response = await fetch(`/api/notifications/${id}`, { method: 'PUT' }).catch(() => null);
		if (response?.ok) {
			notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
		}
	}

	async function markAllAsRead() {
		actionLoading = true;
		const response = await fetch('/api/notifications', { method: 'PUT' }).catch(() => null);
		if (response?.ok) {
			notifications = notifications.map((n) => ({ ...n, read: true }));
		}
		actionLoading = false;
	}

	async function deleteNotification(id: string) {
		const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(
			() => null
		);
		if (response?.ok) {
			notifications = notifications.filter((n) => n.id !== id);
		}
	}

	async function handleTap(notification: Notification) {
		if (!notification.read) {
			await markAsRead(notification.id);
		}

		if (notification.carId) {
			open = false;
			goto(resolve(`/app/cars/${notification.carId}`));
		}
	}

	function getColor(type: string): string {
		const colors: Record<string, string> = {
			estimate_ready: 'bg-blue-500',
			estimate_approved: 'bg-green-500',
			estimate_rejected: 'bg-red-500',
			repair_started: 'bg-yellow-500',
			repair_completed: 'bg-green-500',
			payment_received: 'bg-emerald-500'
		};
		return colors[type] ?? 'bg-gray-500';
	}

	function getRank(type: string): number {
		const rank: Record<string, number> = {
			estimate_ready: 0,
			repair_completed: 0,
			estimate_rejected: 1,
			estimate_approved: 1,
			repair_started: 2,
			payment_received: 2
		};

		return rank[type] ?? 3;
	}

	function getTag(type: string): string {
		const tag: Record<string, string> = {
			estimate_ready: 'Action needed',
			repair_completed: 'Ready for pickup',
			estimate_rejected: 'Needs review',
			estimate_approved: 'Ready to start',
			repair_started: 'In progress',
			payment_received: 'Payment'
		};

		return tag[type] ?? 'Update';
	}

	// side effect: polling cannot be expressed as $derived — requires setInterval
	onMount(() => {
		loadNotifications();
		const interval = setInterval(loadNotifications, 30000);
		return () => clearInterval(interval);
	});
</script>

<Sheet bind:open>
	<SheetTrigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" class="relative">
				<Bell class="h-5 w-5" />
				{#if unreadCount > 0}
					<Badge
						class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-red-500 p-0"
					>
						{unreadCount > 9 ? '9+' : unreadCount}
					</Badge>
				{/if}
			</Button>
		{/snippet}
	</SheetTrigger>
	<SheetContent side="right" class="w-full sm:w-96">
		<SheetHeader>
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					<SheetTitle>Notifications</SheetTitle>
					{#if unreadCount > 0}
						<Badge variant="secondary">{unreadCount} new</Badge>
					{/if}
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={markAllAsRead}
					disabled={!canMarkAll || actionLoading}
				>
					<CheckCheckIcon class="size-4" />
					Mark all read
				</Button>
			</div>
			<SheetDescription>Stay updated on your repair status and payments</SheetDescription>
		</SheetHeader>

		<div class="mt-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
			{#if urgent.length > 0}
				<div class="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
					<div class="flex items-center gap-2 text-sm font-medium text-destructive">
						<TriangleAlertIcon class="size-4" />
						Priority updates
					</div>
					<p class="mt-1 text-xs text-muted-foreground">
						{urgent.length} unread update{urgent.length > 1 ? 's' : ''} need attention
					</p>
				</div>
			{/if}

			<div class="mb-3 flex gap-2">
				<Button
					type="button"
					variant={mode === 'all' ? 'default' : 'outline'}
					size="sm"
					onclick={() => (mode = 'all')}
				>
					All
				</Button>
				<Button
					type="button"
					variant={mode === 'unread' ? 'default' : 'outline'}
					size="sm"
					onclick={() => (mode = 'unread')}
				>
					Unread
				</Button>
			</div>

			{#if loading && notifications.length === 0}
				<div class="p-8 text-center text-muted-foreground">Loading...</div>
			{:else if listed.length === 0}
				<div class="p-8 text-center text-muted-foreground">
					<Bell class="mx-auto mb-2 h-12 w-12 opacity-20" />
					<p>{mode === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
				</div>
			{:else}
				<div class="divide-y">
					{#each listed as notification (notification.id)}
						<div
							role="button"
							tabindex="0"
							class="w-full p-4 text-left transition-colors hover:bg-accent/50 {notification.read
								? 'opacity-60'
								: ''}"
							onclick={() => handleTap(notification)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleTap(notification);
								}
							}}
						>
							<div class="flex gap-3">
								<div class="mt-1 flex-shrink-0">
									<div class="h-2 w-2 rounded-full {getColor(notification.type)}"></div>
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-start justify-between gap-2">
										<div>
											<h4 class="text-sm font-medium">{notification.title}</h4>
											<div class="mt-1">
												<Badge variant="outline" class="text-[10px]">
													{getTag(notification.type)}
												</Badge>
											</div>
										</div>
										<div class="flex items-center gap-1">
											{#if notification.carId}
												<ExternalLinkIcon class="size-3 text-muted-foreground" />
											{/if}
											{#if !notification.read}
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														markAsRead(notification.id);
													}}
													class="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
													aria-label="Mark as read"
												>
													<CheckIcon class="size-3.5" />
												</button>
											{/if}
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													deleteNotification(notification.id);
												}}
												class="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
												aria-label="Delete notification"
											>
												<XIcon class="size-3.5" />
											</button>
										</div>
									</div>
									<p class="mt-1 text-sm text-muted-foreground">{notification.message}</p>
									<span
										class="mt-2 block text-xs text-muted-foreground"
										title={formatDateTime(notification.createdAt)}
									>
										{formatRelativeTime(notification.createdAt)}
									</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</SheetContent>
</Sheet>
