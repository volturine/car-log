<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<p
	class={`px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${className}`}
	{...rest}
>
	{@render children?.()}
</p>
