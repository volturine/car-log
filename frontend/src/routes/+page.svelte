<script lang="ts">
	import { Toaster } from "svelte-sonner";
	import { setApp } from "$lib/hooks/app.svelte.js";
	import { setRepairs, useRepairs } from "$lib/hooks/repairs.svelte.js";
	import { SidebarProvider, SidebarInset } from "$lib/components/ui/sidebar";
	import AppSidebar from "$lib/components/app-sidebar.svelte";
	import AppTopHeader from "$lib/components/app-top-header.svelte";
	import CarsList from "$lib/components/cars/cars-list.svelte";
	import CarDetails from "$lib/components/cars/car-details.svelte";
	import AnalyticsView from "$lib/components/analytics/analytics-view.svelte";
	import CalendarView from "$lib/components/calendar/calendar-view.svelte";

	const app = setApp({ isDarkMode: false });
	const repairsState = setRepairs();
</script>

<Toaster position="bottom-right" theme={app.isDarkMode ? "dark" : "light"} richColors />

<SidebarProvider>
	<AppSidebar />
	<SidebarInset>
		<AppTopHeader />
		<main class="flex-1 overflow-auto">
			{#if repairsState.currentView === "cars"}
				<CarsList />
			{:else if repairsState.currentView === "car-details"}
				<CarDetails />
			{:else if repairsState.currentView === "analytics"}
				<AnalyticsView />
			{:else if repairsState.currentView === "calendar"}
				<CalendarView />
			{/if}
		</main>
	</SidebarInset>
</SidebarProvider>
