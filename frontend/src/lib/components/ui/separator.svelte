<script lang="ts">
	type Orientation = 'horizontal' | 'vertical';
	let {
		orientation = 'horizontal' as Orientation,
		decorative = false,
		class: className = '',
		...rest
	} = $props();
	const isVertical = $derived(orientation === 'vertical');
</script>

<div
	role={decorative ? 'presentation' : 'separator'}
	aria-orientation={orientation}
	class={`${isVertical ? 'h-full w-px' : 'h-px w-full'} shrink-0 bg-border ${className}`}
	{...rest}
></div>
