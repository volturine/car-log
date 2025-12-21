<script lang="ts">
	import { createSelectContext } from './select-context';

	let {
		value = $bindable(''),
		children,
		class: className = '',
		type = 'single',
		...rest
	} = $props();

	const ctx = createSelectContext(value);

	$effect(() => {
		ctx.setValue(value);
	});
</script>

<div class={`relative inline-flex flex-col gap-2 ${className}`} {...rest}>
	{@render children?.({ value: ctx.value, setValue: ctx.setValue, type })}
</div>
