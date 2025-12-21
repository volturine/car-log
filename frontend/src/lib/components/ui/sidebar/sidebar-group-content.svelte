<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<div class={`space-y-1 ${className}`} {...rest}>
	{@render children?.()}
</div>
