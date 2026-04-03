<script lang="ts">
	import CarDetails from '$lib/components/cars/car-details.svelte';
	import { page } from '$app/state';
	import { useRepairs } from '$lib/hooks/repairs.svelte.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const repairs = useRepairs();

	const carId = $derived(page.params.id);

	// side effect: sync route param to shared state so carRepairs/selectedCar stay correct
	$effect(() => {
		repairs.selectedCarId = carId ?? null;
	});
</script>

<CarDetails user={data.user} />
