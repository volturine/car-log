<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { WrenchIcon, ArrowRightIcon, CarIcon, BarChart3Icon, CalendarIcon } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex min-h-screen flex-col bg-background">
	<header class="flex h-14 items-center justify-between border-b px-6">
		<div class="flex items-center gap-2">
			<WrenchIcon class="size-6 text-primary" />
			<span class="text-lg font-semibold">Auto Repair</span>
		</div>
		<nav class="flex items-center gap-2">
			{#if data.user}
				<Button href={resolve('/app')}>
					Open App
					<ArrowRightIcon class="ml-1 size-4" />
				</Button>
			{:else}
				<Button variant="ghost" href={resolve('/auth/login')}>Sign In</Button>
				<Button href={resolve('/auth/register')}>Get Started</Button>
			{/if}
		</nav>
	</header>

	<main class="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
		<div class="flex max-w-2xl flex-col items-center gap-4 text-center">
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
				Track Every Repair,<br />Keep Every Receipt
			</h1>
			<p class="max-w-lg text-lg text-muted-foreground">
				Manage your vehicles, log repairs with parts and costs, and get insights into your
				maintenance history — all in one place.
			</p>
			{#if data.user}
				<Button size="lg" href={resolve('/app')} class="mt-4">
					Go to Dashboard
					<ArrowRightIcon class="ml-2 size-4" />
				</Button>
			{:else}
				<div class="mt-4 flex gap-3">
					<Button size="lg" href={resolve('/auth/register')}>Create Free Account</Button>
					<Button size="lg" variant="outline" href={resolve('/auth/login')}>Sign In</Button>
				</div>
			{/if}
		</div>

		<div class="mt-8 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
			<div class="flex flex-col items-center gap-2 rounded-lg border bg-card p-6 text-center">
				<CarIcon class="size-8 text-primary" />
				<h3 class="font-semibold">Vehicle Tracking</h3>
				<p class="text-sm text-muted-foreground">
					Add all your vehicles with VIN, plates, and owner details in one garage.
				</p>
			</div>
			<div class="flex flex-col items-center gap-2 rounded-lg border bg-card p-6 text-center">
				<BarChart3Icon class="size-8 text-primary" />
				<h3 class="font-semibold">Cost Analytics</h3>
				<p class="text-sm text-muted-foreground">
					See spending by brand, model, and time period to spot trends.
				</p>
			</div>
			<div class="flex flex-col items-center gap-2 rounded-lg border bg-card p-6 text-center">
				<CalendarIcon class="size-8 text-primary" />
				<h3 class="font-semibold">Repair Calendar</h3>
				<p class="text-sm text-muted-foreground">
					View past and upcoming repairs on a timeline to stay on top of maintenance.
				</p>
			</div>
		</div>
	</main>

	<footer class="border-t px-6 py-4 text-center text-sm text-muted-foreground">
		Auto Repair Tracker &middot; Keep your fleet in shape
	</footer>
</div>
