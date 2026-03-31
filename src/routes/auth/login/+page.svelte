<script lang="ts">
	import { signIn } from '$lib/auth-client';
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
	import { toast } from 'svelte-sonner';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);

	async function handleSignIn() {
		if (!email || !password) {
			toast.error('Please fill in all fields');
			return;
		}

		loading = true;

		try {
			const result = await signIn.email({
				email,
				password,
				callbackURL: '/'
			});

			if (result.error) {
				toast.error(result.error.message || 'Failed to sign in');
			} else {
				toast.success('Signed in successfully');
				goto(resolve('/'));
			}
		} catch (error) {
			toast.error('An error occurred during sign in');
			console.error(error);
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle class="text-2xl">Sign In</CardTitle>
			<CardDescription>Enter your credentials to access your account</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSignIn();
				}}
				class="space-y-4"
			>
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
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Signing in...' : 'Sign In'}
				</Button>
			</form>
			<div class="mt-4 text-center text-sm">
				Don't have an account?
				<a href={resolve('/auth/register')} class="text-primary hover:underline">Register</a>
			</div>
		</CardContent>
	</Card>
</div>
