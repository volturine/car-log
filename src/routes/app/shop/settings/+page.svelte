<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import {
		ArrowLeftIcon,
		SaveIcon,
		UserPlusIcon,
		Trash2Icon,
		UsersIcon,
		LoaderIcon,
		SearchIcon
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { formatDate } from '$lib/utils';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';

	interface Candidate {
		id: string;
		email: string;
		name: string | null;
		role: string;
	}

	let { data }: { data: PageData } = $props();

	const shop = $derived(data.shop);

	let name = $state(untrack(() => data.shop.name));
	let email = $state(untrack(() => data.shop.email ?? ''));
	let phone = $state(untrack(() => data.shop.phone ?? ''));
	let address = $state(untrack(() => data.shop.address ?? ''));
	let city = $state(untrack(() => data.shop.city ?? ''));
	let region = $state(untrack(() => data.shop.state ?? ''));
	let zip = $state(untrack(() => data.shop.zipCode ?? ''));
	let specialties = $state(
		untrack(() => {
			if (!data.shop.specialties) return '';
			try {
				const parsed = JSON.parse(data.shop.specialties);
				return Array.isArray(parsed) ? parsed.join(', ') : data.shop.specialties;
			} catch {
				return data.shop.specialties;
			}
		})
	);
	let saving = $state(false);

	let members = $state<
		Array<{
			userId: string;
			role: string;
			joinedAt: Date | string | null;
			userName: string | null;
			userEmail: string;
		}>
	>([]);
	let loadingMembers = $state(true);
	let inviteQuery = $state('');
	let inviteRole = $state<string>('mechanic');
	let inviting = $state(false);
	let candidates = $state<Candidate[]>([]);
	let searching = $state(false);
	let selected = $state<Candidate | null>(null);

	const ready = $derived(name.trim().length > 0);

	// Side effect: fetch members from API on mount
	$effect(() => {
		fetchMembers();
	});

	async function fetchMembers() {
		loadingMembers = true;
		const response = await fetch(`/api/shops/${shop.id}/members`).catch(() => null);

		if (!response || !response.ok) {
			loadingMembers = false;
			return;
		}

		const result = await response.json();
		members = result.data ?? result;
		loadingMembers = false;
	}

	async function handleSave() {
		if (!name.trim()) {
			toast.error('Shop name is required');
			return;
		}

		saving = true;

		const response = await fetch(`/api/shops/${shop.id}`, {
			method: 'PUT',
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
			toast.error('Failed to save shop settings');
			saving = false;
			return;
		}

		toast.success('Shop settings saved');
		saving = false;
	}

	async function searchUsers() {
		const query = inviteQuery.trim();
		if (query.length < 2) {
			candidates = [];
			return;
		}

		searching = true;
		const params = new URLSearchParams({ shopId: shop.id, query });
		const response = await fetch(`/api/users?${params}`).catch(() => null);

		if (!response || !response.ok) {
			candidates = [];
			searching = false;
			return;
		}

		const result = await response.json();
		candidates = result.data ?? result;
		searching = false;
	}

	function selectCandidate(candidate: Candidate) {
		selected = candidate;
		inviteQuery = candidate.email;
		candidates = [];
	}

	async function handleInvite() {
		if (selected) {
			inviting = true;

			const response = await fetch(`/api/shops/${shop.id}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: selected.id, role: inviteRole })
			}).catch(() => null);

			if (!response || !response.ok) {
				const msg = response ? await response.text().catch(() => '') : '';
				toast.error(msg || 'Failed to add member');
				inviting = false;
				return;
			}

			toast.success('Member added');
			inviteQuery = '';
			selected = null;
			inviting = false;
			await fetchMembers();
			return;
		}

		if (!inviteQuery.trim()) {
			toast.error('Search for a user or enter an email');
			return;
		}

		inviting = true;

		const response = await fetch(`/api/shops/${shop.id}/members/invite`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: inviteQuery.trim(), role: inviteRole })
		}).catch(() => null);

		if (!response || !response.ok) {
			const msg = response ? await response.text().catch(() => '') : '';
			toast.error(msg || 'Failed to add member — user may not exist or is already a member');
			inviting = false;
			return;
		}

		toast.success('Member added');
		inviteQuery = '';
		selected = null;
		inviting = false;
		await fetchMembers();
	}

	async function handleRemove(userId: string) {
		const response = await fetch(`/api/shops/${shop.id}/members`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userId })
		}).catch(() => null);

		if (!response || !response.ok) {
			toast.error('Failed to remove member');
			return;
		}

		toast.success('Member removed');
		await fetchMembers();
	}
</script>

<div class="mx-auto max-w-3xl space-y-6 p-6">
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={() => goto(resolve('/app/shop'))}>
			<ArrowLeftIcon />
		</Button>
		<div>
			<h1 class="text-3xl font-bold">Shop Settings</h1>
			<p class="text-muted-foreground">Manage your shop details and team</p>
		</div>
	</div>

	<Card>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<CardHeader>
				<CardTitle>Shop Details</CardTitle>
				<CardDescription>Update your shop profile information</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="name">Shop Name *</Label>
					<Input
						id="name"
						bind:value={name}
						placeholder="Mike's Auto Repair"
						required
						disabled={saving}
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
							disabled={saving}
						/>
					</div>
					<div class="space-y-2">
						<Label for="phone">Phone</Label>
						<Input
							id="phone"
							type="tel"
							bind:value={phone}
							placeholder="(555) 123-4567"
							disabled={saving}
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="address">Street Address</Label>
					<Input id="address" bind:value={address} placeholder="123 Main St" disabled={saving} />
				</div>

				<div class="grid gap-4 md:grid-cols-3">
					<div class="space-y-2">
						<Label for="city">City</Label>
						<Input id="city" bind:value={city} placeholder="Springfield" disabled={saving} />
					</div>
					<div class="space-y-2">
						<Label for="region">State</Label>
						<Input id="region" bind:value={region} placeholder="IL" disabled={saving} />
					</div>
					<div class="space-y-2">
						<Label for="zip">Zip Code</Label>
						<Input id="zip" bind:value={zip} placeholder="62701" disabled={saving} />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="specialties">Specialties</Label>
					<Textarea
						id="specialties"
						bind:value={specialties}
						placeholder="Brakes, Engine repair, Oil change (comma-separated)"
						rows={2}
						disabled={saving}
					/>
					<p class="text-xs text-muted-foreground">
						Comma-separated list of services your shop offers
					</p>
				</div>
			</CardContent>
			<CardFooter>
				<Button type="submit" disabled={saving || !ready}>
					<SaveIcon class="size-4" />
					{saving ? 'Saving...' : 'Save Changes'}
				</Button>
			</CardFooter>
		</form>
	</Card>

	<Separator />

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<UsersIcon class="size-5" />
				Team Members
			</CardTitle>
			<CardDescription>Manage mechanics and staff who work at your shop</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if loadingMembers}
				<div class="flex items-center justify-center py-6">
					<LoaderIcon class="size-5 animate-spin text-muted-foreground" />
				</div>
			{:else if members.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">No team members yet</p>
			{:else}
				<div class="space-y-2">
					{#each members as member (member.userId)}
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="font-medium">{member.userName ?? 'Unknown'}</span>
									<Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
										{member.role}
									</Badge>
								</div>
								<div class="text-sm text-muted-foreground">{member.userEmail}</div>
								{#if member.joinedAt}
									<div class="text-xs text-muted-foreground">
										Joined {formatDate(member.joinedAt)}
									</div>
								{/if}
							</div>
							{#if member.role !== 'owner'}
								<Button variant="ghost" size="icon" onclick={() => handleRemove(member.userId)}>
									<Trash2Icon class="size-4 text-destructive" />
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<Separator />

			<div class="space-y-3">
				<h4 class="text-sm font-medium">Add Team Member</h4>
				<p class="text-xs text-muted-foreground">
					Search by name or email to find registered mechanics or shop owners.
				</p>
				<div class="flex gap-2">
					<div class="relative flex-1">
						<Input
							bind:value={inviteQuery}
							placeholder="Search by name or email..."
							disabled={inviting}
							oninput={() => {
								selected = null;
								searchUsers();
							}}
						/>
						{#if searching}
							<div class="absolute top-1/2 right-3 -translate-y-1/2">
								<LoaderIcon class="size-4 animate-spin text-muted-foreground" />
							</div>
						{/if}
						{#if candidates.length > 0}
							<div
								class="absolute top-full right-0 left-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md"
							>
								{#each candidates as candidate (candidate.id)}
									<button
										type="button"
										class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
										onclick={() => selectCandidate(candidate)}
									>
										<div class="flex-1">
											<div class="font-medium">{candidate.name ?? candidate.email}</div>
											{#if candidate.name}
												<div class="text-xs text-muted-foreground">{candidate.email}</div>
											{/if}
										</div>
										<Badge variant="outline" class="text-xs">{candidate.role}</Badge>
									</button>
								{/each}
							</div>
						{/if}
					</div>
					<Select type="single" bind:value={inviteRole}>
						<SelectTrigger class="w-[130px]">{inviteRole}</SelectTrigger>
						<SelectContent>
							<SelectItem value="mechanic">Mechanic</SelectItem>
							<SelectItem value="owner">Owner</SelectItem>
						</SelectContent>
					</Select>
					<Button onclick={handleInvite} disabled={inviting || (!selected && !inviteQuery.trim())}>
						<UserPlusIcon class="size-4" />
						{inviting ? 'Adding...' : 'Add'}
					</Button>
				</div>
				{#if selected}
					<div class="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
						<SearchIcon class="size-4 text-muted-foreground" />
						<span>Selected: <strong>{selected.name ?? selected.email}</strong></span>
						<Badge variant="outline" class="text-xs">{selected.role}</Badge>
						<button
							type="button"
							class="ml-auto text-xs text-muted-foreground hover:text-foreground"
							onclick={() => {
								selected = null;
								inviteQuery = '';
							}}
						>
							Clear
						</button>
					</div>
				{/if}
			</div>
		</CardContent>
	</Card>
</div>
