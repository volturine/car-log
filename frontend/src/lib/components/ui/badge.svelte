<script lang="ts">
	type Variant = 'default' | 'secondary' | 'outline';

	const variants: Record<Variant, string> = {
		default: 'border-transparent bg-primary text-primary-foreground shadow',
		secondary: 'border-transparent bg-secondary text-secondary-foreground',
		outline: 'text-foreground'
	};

	let { variant = 'default' as Variant, class: className = '', children, ...rest } = $props();
	const resolvedVariant = $derived(variants[variant] ?? variants.default);
</script>

<span
	class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background ${resolvedVariant} ${className}`}
	{...rest}
>
	{@render children?.()}
</span>
