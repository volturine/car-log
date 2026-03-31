<script lang="ts">
	import ShopDashboard from '$lib/components/shops/shop-dashboard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ShopDashboard shop={data.shop} isOwner={data.isOwner} />
