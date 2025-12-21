<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<div class={`flex-1 overflow-y-auto px-2 py-3 ${className}`} {...rest}>
	{@render children?.()}
</div>
