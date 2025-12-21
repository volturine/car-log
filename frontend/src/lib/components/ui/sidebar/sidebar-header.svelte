<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<div class={`flex h-16 items-center gap-2 px-4 ${className}`} {...rest}>
	{@render children?.()}
</div>
