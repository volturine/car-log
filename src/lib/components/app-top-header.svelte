<script lang="ts">
	import { useApp } from '$lib/hooks/app.svelte.js';
	import { useSidebar } from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import { PanelLeftIcon, SunIcon, MoonIcon } from '@lucide/svelte';
	import NotificationBell from '$lib/components/notifications/notification-bell.svelte';

	const sidebar = useSidebar();
	const app = useApp();
</script>

<header
	class="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm"
>
	<Button size="icon" variant="ghost" class="size-8" onclick={() => sidebar.toggle()}>
		<PanelLeftIcon />
	</Button>

	<div class="flex items-center gap-2">
		<NotificationBell />
		<Button
			size="icon"
			variant="outline"
			class="size-8 rounded-lg"
			onclick={() => app.darkModeToggle()}
		>
			{#if app.isDarkMode}
				<SunIcon />
			{:else}
				<MoonIcon />
			{/if}
		</Button>
	</div>
</header>
