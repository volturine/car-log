<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<div class={`w-full ${className}`} {...rest}>
	{@render children?.()}
</div>
