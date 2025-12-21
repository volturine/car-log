<script lang="ts">
	let { class: className = '', value = $bindable(''), rows = 3, ...rest } = $props();
</script>

<textarea
	{rows}
	bind:value
	class={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ring-offset-background ${className}`}
	{...rest}
></textarea>
