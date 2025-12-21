<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<nav class={`space-y-1 ${className}`} {...rest}>
	{@render children?.()}
</nav>
