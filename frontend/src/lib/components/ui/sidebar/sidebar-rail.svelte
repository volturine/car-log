<script lang="ts">
	let { class: className = '', ...rest } = $props();
</script>

<div
	class={`hidden h-full w-2 shrink-0 bg-sidebar-border opacity-60 md:block ${className}`}
	{...rest}
></div>
