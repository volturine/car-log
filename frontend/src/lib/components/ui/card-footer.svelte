<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<div class={`flex items-center p-6 pt-0 ${className}`} {...rest}>
	{@render children?.()}
</div>
