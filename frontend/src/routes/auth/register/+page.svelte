<script lang="ts">
	import { signUp } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import { USER_ROLE } from '$lib/constants';

	let email = $state('');
	let password = $state('');
	let name = $state('');
	let confirmPassword = $state('');
	let role = $state<string>(USER_ROLE.CUSTOMER);
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

		try {
			const result = await signUp.email(
				{
					email,
					password,
					name,
					callbackURL: '/'
				},
				{
					onRequest: async (ctx) => {
						// Add role to the request
						return {
							body: {
								...ctx.body,
								role
							}
						};
					}
				}
			);

			if (result.error) {
				toast.error(result.error.message || 'Failed to register');
			} else {
				toast.success('Account created successfully');
				goto('/');
			}
		} catch (error) {
			toast.error('An error occurred during registration');
			console.error(error);
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle class="text-2xl">Create Account</CardTitle>
			<CardDescription>Enter your details to create a new account</CardDescription>
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
					<Label for="role">Account Type</Label>
					<Select
						onValueChange={(value) => {
							if (value) role = value;
						}}
						disabled={loading}
					>
						<SelectTrigger id="role">
							<SelectValue placeholder="Select account type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={USER_ROLE.CUSTOMER}>Customer (Car Owner)</SelectItem>
							<SelectItem value={USER_ROLE.SHOP_OWNER}>Shop Owner</SelectItem>
							<SelectItem value={USER_ROLE.MECHANIC}>Mechanic</SelectItem>
						</SelectContent>
					</Select>
					<p class="text-xs text-muted-foreground">
						{#if role === USER_ROLE.CUSTOMER}
							Track repairs for your vehicles
						{:else if role === USER_ROLE.SHOP_OWNER}
							Manage your repair shop and create repairs for customers
						{:else if role === USER_ROLE.MECHANIC}
							Work on repairs and update status
						{/if}
					</p>
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
					{loading ? 'Creating account...' : 'Create Account'}
				</Button>
			</form>
			<div class="mt-4 text-center text-sm">
				Already have an account?
				<a href="/auth/login" class="text-primary hover:underline">Sign in</a>
			</div>
		</CardContent>
	</Card>
</div>
