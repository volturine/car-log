<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<div class={`border-t border-sidebar-border px-4 py-3 ${className}`} {...rest}>
	{@render children?.()}
</div>
