<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<h3 class={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...rest}>
	{@render children?.()}
</h3>
