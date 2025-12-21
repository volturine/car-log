<script module lang="ts">
	export { default as CardHeader } from './card-header.svelte';
	export { default as CardTitle } from './card-title.svelte';
	export { default as CardDescription } from './card-description.svelte';
	export { default as CardContent } from './card-content.svelte';
	export { default as CardFooter } from './card-footer.svelte';
</script>

<script lang="ts">
	let { class: className = '', children, ...rest } = $props();
</script>

<div class={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...rest}>
	{@render children?.()}
</div>
