<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { StoreIcon, ArrowLeftIcon, CheckCircle2Icon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let address = $state('');
	let city = $state('');
	let region = $state('');
	let zip = $state('');
	let specialties = $state('');
	let loading = $state(false);

	const ready = $derived(name.trim().length > 0);

	async function handleCreate() {
		if (!name.trim()) {
			toast.error('Shop name is required');
			return;
		}

		loading = true;

		const response = await fetch('/api/shops', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: name.trim(),
				email: email.trim() || null,
				phone: phone.trim() || null,
				address: address.trim() || null,
				city: city.trim() || null,
				state: region.trim() || null,
				zipCode: zip.trim() || null,
				specialties: specialties
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
			})
		}).catch(() => null);

		if (!response || !response.ok) {
			toast.error('Failed to create shop — please try again');
			loading = false;
			return;
		}

		toast.success('Shop created! Welcome to your dashboard.');
		goto(resolve('/app/shop'));
	}
</script>

<div class="mx-auto max-w-2xl space-y-6 p-6">
	<Button variant="ghost" size="sm" onclick={() => goto(resolve('/app'))}>
		<ArrowLeftIcon class="size-4" />
		Back to app
	</Button>

	<div class="text-center">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
			<StoreIcon class="h-8 w-8 text-primary" />
		</div>
		<h1 class="text-3xl font-bold">Set Up Your Shop</h1>
		<p class="mt-2 text-muted-foreground">
			Create your repair shop profile so customers can find you and you can start managing repairs.
		</p>
	</div>

	<div class="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
		<CheckCircle2Icon class="h-5 w-5 shrink-0 text-primary" />
		<p class="text-sm text-muted-foreground">
			Only a shop name is required to get started. You can fill in contact details and specialties
			later from your shop settings.
		</p>
	</div>

	<Card>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleCreate();
			}}
		>
			<CardHeader>
				<CardTitle>Shop Details</CardTitle>
				<CardDescription>Fill in the basics — you can update these later.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="name">Shop Name *</Label>
					<Input
						id="name"
						bind:value={name}
						placeholder="Mike's Auto Repair"
						required
						disabled={loading}
					/>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="email">Contact Email</Label>
						<Input
							id="email"
							type="email"
							bind:value={email}
							placeholder="shop@example.com"
							disabled={loading}
						/>
					</div>
					<div class="space-y-2">
						<Label for="phone">Phone</Label>
						<Input
							id="phone"
							type="tel"
							bind:value={phone}
							placeholder="(555) 123-4567"
							disabled={loading}
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="address">Street Address</Label>
					<Input id="address" bind:value={address} placeholder="123 Main St" disabled={loading} />
				</div>

				<div class="grid gap-4 md:grid-cols-3">
					<div class="space-y-2">
						<Label for="city">City</Label>
						<Input id="city" bind:value={city} placeholder="Springfield" disabled={loading} />
					</div>
					<div class="space-y-2">
						<Label for="region">State</Label>
						<Input id="region" bind:value={region} placeholder="IL" disabled={loading} />
					</div>
					<div class="space-y-2">
						<Label for="zip">Zip Code</Label>
						<Input id="zip" bind:value={zip} placeholder="62701" disabled={loading} />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="specialties">Specialties</Label>
					<Textarea
						id="specialties"
						bind:value={specialties}
						placeholder="Brakes, Engine repair, Oil change (comma-separated)"
						rows={2}
						disabled={loading}
					/>
					<p class="text-xs text-muted-foreground">
						Comma-separated list of services your shop offers
					</p>
				</div>
			</CardContent>
			<CardFooter class="flex-col gap-3">
				<Button type="submit" class="w-full" disabled={loading || !ready}>
					<StoreIcon class="size-4" />
					{loading ? 'Creating Shop...' : 'Create Shop & Open Dashboard'}
				</Button>
				<p class="text-center text-xs text-muted-foreground">
					You'll be redirected to your shop dashboard after creation.
				</p>
			</CardFooter>
		</form>
	</Card>
</div>
