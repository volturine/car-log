<script lang="ts">
	import { useSidebar } from './context.svelte';

	type Collapsible = 'offcanvas' | 'icon' | 'none';

	const sidebar = useSidebar();

	let {
		collapsible = 'offcanvas' as Collapsible,
		class: className = '',
		children,
		...rest
	} = $props();

	const getWidthClass = $derived(() => {
		if (sidebar.isOpen) return 'w-64';
		if (collapsible === 'icon') return 'w-16';
		return 'w-0';
	});

	const getTranslateClass = $derived(() => {
		if (collapsible !== 'offcanvas') return '';
		return sidebar.isOpen ? 'translate-x-0' : '-translate-x-full';
	});
</script>

<aside
	class={`group/sidebar relative z-30 flex h-full min-h-screen flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-all duration-300 ${getWidthClass()} ${getTranslateClass()} ${className}`}
	{...rest}
>
	{@render children?.()}
</aside>
