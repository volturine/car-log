<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<p class={`text-sm text-muted-foreground ${className}`} {...rest}>
	{@render children?.()}
</p>
