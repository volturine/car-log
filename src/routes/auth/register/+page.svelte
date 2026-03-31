<script lang="ts">
	import { signUp } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { CarIcon, StoreIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const intent = $derived(page.url.searchParams.get('intent'));
	const shop = $derived(intent === 'shop_owner');

	let email = $state('');
	let password = $state('');
	let name = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);

	async function handleSignUp() {
		if (!email || !password || !name) {
			toast.error('Please fill in all fields');
			return;
		}

		if (password !== confirmPassword) {
			toast.error('Passwords do not match');
			return;
		}

		if (password.length < 8) {
			toast.error('Password must be at least 8 characters');
			return;
		}

		loading = true;

		const result = await signUp
			.email({
				email,
				password,
				name
			})
			.catch(() => ({ error: { message: 'Network error — check your connection' }, data: null }));

		if (result.error) {
			toast.error(result.error.message || 'Failed to register');
			loading = false;
			return;
		}

		if (shop) {
			const upgrade = await fetch('/api/users/become-shop-owner', {
				method: 'POST'
			}).catch(() => null);

			if (!upgrade || !upgrade.ok) {
				toast.error('Account created but shop upgrade failed — contact support');
				loading = false;
				goto(resolve('/app'));
				return;
			}

			toast.success("Shop owner account created — let's set up your shop!");
			goto(resolve('/app/shop/setup'));
			return;
		}

		toast.success('Account created — welcome!');
		goto(resolve('/app'));
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<Card class="w-full max-w-md">
		<CardHeader class="text-center">
			<div
				class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
			>
				{#if shop}
					<StoreIcon class="h-6 w-6 text-primary" />
				{:else}
					<CarIcon class="h-6 w-6 text-primary" />
				{/if}
			</div>
			<CardTitle class="text-2xl">
				{shop ? 'Create Your Shop Account' : 'Create Your Account'}
			</CardTitle>
			<CardDescription>
				{shop
					? 'Register as a shop owner to manage repairs, invite mechanics, and grow your business.'
					: 'Sign up to track your vehicles, repairs, and service history.'}
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSignUp();
				}}
				class="space-y-4"
			>
				<div class="space-y-2">
					<Label for="name">Name</Label>
					<Input
						id="name"
						type="text"
						placeholder="John Doe"
						bind:value={name}
						required
						disabled={loading}
					/>
				</div>
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						type="email"
						placeholder="you@example.com"
						bind:value={email}
						required
						disabled={loading}
					/>
				</div>
				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						type="password"
						placeholder="••••••••"
						bind:value={password}
						required
						disabled={loading}
					/>
				</div>
				<div class="space-y-2">
					<Label for="confirmPassword">Confirm Password</Label>
					<Input
						id="confirmPassword"
						type="password"
						placeholder="••••••••"
						bind:value={confirmPassword}
						required
						disabled={loading}
					/>
				</div>
				<Button type="submit" class="w-full" disabled={loading}>
					{#if loading}
						{shop ? 'Setting up shop...' : 'Creating account...'}
					{:else}
						{shop ? 'Create Shop Owner Account' : 'Create Customer Account'}
					{/if}
				</Button>
			</form>

			{#if shop}
				<p class="mt-4 text-center text-xs text-muted-foreground">
					This creates a <strong>shop owner</strong> account. After registration you'll set up your shop
					profile.
				</p>
			{:else}
				<p class="mt-4 text-center text-xs text-muted-foreground">
					This creates a <strong>customer</strong> account for managing your vehicles. Want to
					register a shop instead?
					<a
						href="{resolve('/auth/register')}?intent=shop_owner"
						class="text-primary hover:underline"
					>
						Open a shop
					</a>
				</p>
			{/if}

			<div class="mt-3 text-center text-sm">
				Already have an account?
				<a href={resolve('/auth/login')} class="text-primary hover:underline">Sign in</a>
			</div>
			{#if data.googleEnabled}
				<p class="mt-3 text-center text-xs text-muted-foreground">
					Want to use Google instead?
					<a href={resolve('/auth/login')} class="text-primary hover:underline">
						Sign in with Google
					</a>
					to create an account automatically.
				</p>
			{/if}
		</CardContent>
	</Card>
</div>
