<script lang="ts">
	let { children, class: className = '', ...rest } = $props();
</script>

<div class={`flex min-h-screen flex-1 flex-col bg-background ${className}`} {...rest}>
	{@render children?.()}
</div>
