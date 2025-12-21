<script lang="ts">
	import { useApp } from "$lib/hooks/app.svelte.js";
	import { useSidebar } from "$lib/components/ui/sidebar";
	import { Button } from "$lib/components/ui/button";
	import { PanelLeftIcon, SunIcon, MoonIcon } from "@lucide/svelte";

	const sidebar = useSidebar();
	const app = useApp();
</script>

<header class="sticky top-0 z-50 flex items-center justify-between px-4 gap-4 border-b h-14 bg-background/95 backdrop-blur-sm">
	<Button size="icon" variant="ghost" class="size-8" onclick={() => sidebar.toggle()}>
		<PanelLeftIcon />
	</Button>

	<Button size="icon" variant="outline" class="size-8 rounded-lg" onclick={() => app.darkModeToggle()}>
		{#if app.isDarkMode}
			<SunIcon />
		{:else}
			<MoonIcon />
		{/if}
	</Button>
</header>
