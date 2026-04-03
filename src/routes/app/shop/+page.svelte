<script lang="ts">
	import MechanicDashboard from '$lib/components/shops/mechanic-dashboard.svelte';
	import ShopDashboard from '$lib/components/shops/shop-dashboard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

{#if data.isMechanic}
	<MechanicDashboard shop={data.shop} userId={data.userId} />
{:else}
	<ShopDashboard shop={data.shop} isOwner={data.isOwner} />
{/if}
