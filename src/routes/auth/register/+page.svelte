<script lang="ts">
	import { signUp } from '$lib/auth-client';
	import { goto } from '$app/navigation';
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
	import { CarIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
				<CarIcon class="h-6 w-6 text-primary" />
			</div>
			<CardTitle class="text-2xl">Create Your Account</CardTitle>
			<CardDescription>
				Sign up to track your vehicles, repairs, and service history.
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
					{loading ? 'Creating account...' : 'Create Customer Account'}
				</Button>
			</form>

			<p class="mt-4 text-center text-xs text-muted-foreground">
				This creates a <strong>customer</strong> account for managing your vehicles. Shop owners and mechanics
				are provisioned by an administrator.
			</p>

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
