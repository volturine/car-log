<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Bell, ExternalLinkIcon, CheckIcon, XIcon } from '@lucide/svelte';
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
		carId?: string | null;
	};

	let notifications = $state<Notification[]>([]);
	const unreadCount = $derived(notifications.filter((n) => !n.read).length);
	let loading = $state(false);
	let open = $state(false);

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
			<div class="flex items-center justify-between">
				<SheetTitle>Notifications</SheetTitle>
				{#if unreadCount > 0}
					<Badge variant="secondary">{unreadCount} new</Badge>
				{/if}
			</div>
			<SheetDescription>Stay updated on your repair status and payments</SheetDescription>
		</SheetHeader>

		<div class="mt-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
			{#if loading && notifications.length === 0}
				<div class="p-8 text-center text-muted-foreground">Loading...</div>
			{:else if notifications.length === 0}
				<div class="p-8 text-center text-muted-foreground">
					<Bell class="mx-auto mb-2 h-12 w-12 opacity-20" />
					<p>No notifications yet</p>
				</div>
			{:else}
				<div class="divide-y">
					{#each notifications as notification (notification.id)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div
							class="cursor-pointer p-4 transition-colors hover:bg-accent/50 {notification.read
								? 'opacity-60'
								: ''}"
							onclick={() => handleTap(notification)}
						>
							<div class="flex gap-3">
								<div class="mt-1 flex-shrink-0">
									<div class="h-2 w-2 rounded-full {getColor(notification.type)}"></div>
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-start justify-between gap-2">
										<h4 class="text-sm font-medium">{notification.title}</h4>
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
									<span class="mt-2 block text-xs text-muted-foreground">
										{formatDate(notification.createdAt)}
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
