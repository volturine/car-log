<script lang="ts">
	import { setApp } from '$lib/hooks/app.svelte.js';
	import { setRepairs } from '$lib/hooks/repairs.svelte.js';
	import { SidebarProvider, SidebarInset } from '$lib/components/ui/sidebar';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import AppTopHeader from '$lib/components/app-top-header.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	setApp({ isDarkMode: false });
	setRepairs();
</script>

<SidebarProvider>
	<AppSidebar user={data.user} />
	<SidebarInset>
		<AppTopHeader />
		<main class="flex-1 overflow-auto">
			{@render children()}
		</main>
	</SidebarInset>
</SidebarProvider>
