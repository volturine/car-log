<script lang="ts">
	import CarDetails from '$lib/components/cars/car-details.svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const carId = $derived(page.params.id);
</script>

<CarDetails user={data.user} {carId} />
