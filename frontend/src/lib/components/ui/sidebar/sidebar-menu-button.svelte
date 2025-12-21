<script lang="ts">
	let { isActive = false, class: className = '', children, ...rest } = $props();
</script>

<button
	type="button"
	class={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ${isActive ? 'bg-accent text-accent-foreground font-semibold' : 'text-sidebar-foreground'} ${className}`}
	aria-pressed={isActive}
	{...rest}
>
	{@render children?.()}
</button>
