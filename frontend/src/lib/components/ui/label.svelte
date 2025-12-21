<script lang="ts">
	let { class: className = '', for: htmlFor, children, ...rest } = $props();
</script>

<label
	class={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
	for={htmlFor}
	{...rest}
>
	{@render children?.()}
</label>
