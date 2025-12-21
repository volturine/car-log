<script lang="ts">
	import { useSelectContext } from './select-context';

	const ctx = useSelectContext();
	let { value, children, class: className = '', ...rest } = $props();
	const isSelected = $derived(ctx.value === value);
</script>

<button
	type="button"
	class={`flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ${isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground'} ${className}`}
	onclick={() => ctx.setValue(value)}
	aria-pressed={isSelected}
	{...rest}
>
	{@render children?.()}
</button>
