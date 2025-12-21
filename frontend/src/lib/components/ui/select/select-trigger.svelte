<script lang="ts">
	import { useSelectContext } from './select-context';

	const ctx = useSelectContext();
	let { children, class: className = '', ...rest } = $props();
</script>

<button
	type="button"
	class={`inline-flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ${className}`}
	{...rest}
>
	<span class="flex-1 text-left">
		{@render children?.({ value: ctx.value })}
	</span>
	<svg
		class="size-4 text-muted-foreground"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<polyline points="6 9 12 15 18 9"></polyline>
	</svg>
</button>
