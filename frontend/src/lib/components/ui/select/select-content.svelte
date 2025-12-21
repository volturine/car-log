<script lang="ts">
	let { children, class: className = '', ...rest } = $props();
</script>

<div
	class={`mt-2 w-full min-w-[12rem] rounded-md border border-input bg-popover text-popover-foreground shadow-md ${className}`}
	{...rest}
>
	<div class="max-h-64 overflow-y-auto p-1">
		{@render children?.()}
	</div>
</div>
