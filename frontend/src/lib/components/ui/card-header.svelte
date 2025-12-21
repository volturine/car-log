<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<div class={`flex flex-col space-y-1.5 p-6 ${className}`} {...rest}>
	{@render children?.()}
</div>
