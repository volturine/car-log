<script lang="ts">
	import { onMount } from 'svelte';
	import { Bell } from '@lucide/svelte';
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
	import { formatDate } from '$lib/utils';

	type Notification = {
		id: string;
		type: string;
		title: string;
		message: string;
		read: boolean;
		createdAt: string;
		relatedId?: string;
		relatedType?: string;
	};

	let notifications = $state<Notification[]>([]);
	let unreadCount = $derived(notifications.filter((n) => !n.read).length);
	let loading = $state(false);
	let open = $state(false);

	async function loadNotifications() {
		loading = true;
		try {
			const response = await fetch('/api/notifications');
			if (response.ok) {
				const result = await response.json();
				notifications = result.data || result;
			}
		} catch (error) {
			console.error('Failed to load notifications:', error);
		} finally {
			loading = false;
		}
	}

	async function markAsRead(id: string) {
		try {
			const response = await fetch(`/api/notifications/${id}`, {
				method: 'PUT'
			});

			if (response.ok) {
				notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
			}
		} catch (error) {
			console.error('Failed to mark notification as read:', error);
		}
	}

	async function deleteNotification(id: string) {
		try {
			const response = await fetch(`/api/notifications/${id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				notifications = notifications.filter((n) => n.id !== id);
			}
		} catch (error) {
			console.error('Failed to delete notification:', error);
		}
	}

	function getNotificationColor(type: string): string {
		switch (type) {
			case 'estimate_ready':
				return 'bg-blue-500';
			case 'estimate_approved':
				return 'bg-green-500';
			case 'estimate_rejected':
				return 'bg-red-500';
			case 'repair_started':
				return 'bg-yellow-500';
			case 'repair_completed':
				return 'bg-green-500';
			case 'payment_received':
				return 'bg-emerald-500';
			default:
				return 'bg-gray-500';
		}
	}

	onMount(() => {
		loadNotifications();

		// Poll for new notifications every 30 seconds
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
			<div class="flex items-center justify-between">
				<SheetTitle>Notifications</SheetTitle>
				{#if unreadCount > 0}
					<Badge variant="secondary">{unreadCount} new</Badge>
				{/if}
			</div>
			<SheetDescription>Stay updated on your repair status and payments</SheetDescription>
		</SheetHeader>

		<div class="mt-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
			{#if loading}
				<div class="p-8 text-center text-muted-foreground">Loading...</div>
			{:else if notifications.length === 0}
				<div class="p-8 text-center text-muted-foreground">
					<Bell class="mx-auto mb-2 h-12 w-12 opacity-20" />
					<p>No notifications yet</p>
				</div>
			{:else}
				<div class="divide-y">
					{#each notifications as notification (notification.id)}
						<div
							class="p-4 transition-colors hover:bg-accent/50 {notification.read
								? 'opacity-60'
								: ''}"
						>
							<div class="flex gap-3">
								<div class="mt-1 flex-shrink-0">
									<div class="h-2 w-2 rounded-full {getNotificationColor(notification.type)}"></div>
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-start justify-between gap-2">
										<h4 class="text-sm font-medium">{notification.title}</h4>
										<button
											onclick={() => deleteNotification(notification.id)}
											class="text-muted-foreground hover:text-foreground"
											aria-label="Delete notification"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M6 18L18 6M6 6l12 12"
												/>
											</svg>
										</button>
									</div>
									<p class="mt-1 text-sm text-muted-foreground">{notification.message}</p>
									<div class="mt-2 flex items-center gap-2">
										<span class="text-xs text-muted-foreground">
											{formatDate(notification.createdAt)}
										</span>
										{#if !notification.read}
											<button
												onclick={() => markAsRead(notification.id)}
												class="text-xs text-primary hover:underline"
											>
												Mark as read
											</button>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</SheetContent>
</Sheet>
