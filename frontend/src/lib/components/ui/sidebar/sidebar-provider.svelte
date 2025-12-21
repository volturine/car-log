<script lang="ts">
	import { createSidebarContext } from './context.svelte';

	let { children, class: className = '', ...rest } = $props();

	createSidebarContext();
</script>

<div class={`flex min-h-screen w-full bg-background text-foreground ${className}`} {...rest}>
	{@render children?.()}
</div>
