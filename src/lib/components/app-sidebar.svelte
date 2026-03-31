<script lang="ts">
	import { useRepairs } from '$lib/hooks/repairs.svelte.js';
	import { signOut } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import {
		Sidebar,
		SidebarContent,
		SidebarFooter,
		SidebarHeader,
		SidebarRail,
		SidebarGroup,
		SidebarGroupLabel,
		SidebarGroupContent,
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton
	} from '$lib/components/ui/sidebar';
	import {
		CarIcon,
		BarChart3Icon,
		WrenchIcon,
		CalendarIcon,
		LogOutIcon,
		StoreIcon,
		LayoutDashboardIcon
	} from '@lucide/svelte';
	import { USER_ROLE } from '$lib/constants';

	const repairs = useRepairs();

	let { user }: { user?: { name: string; email: string; role?: string | null } } = $props();

	const isShopUser = $derived(
		user?.role === USER_ROLE.SHOP_OWNER || user?.role === USER_ROLE.MECHANIC
	);

	const pathname = $derived(page.url.pathname);

	async function handleSignOut() {
		await signOut();
		goto(resolve('/auth/login'));
	}
</script>

<Sidebar collapsible="offcanvas">
	<SidebarHeader class="h-14 flex-row items-center border-b border-sidebar-border px-4">
		<div class="flex items-center gap-2">
			<WrenchIcon class="size-6 text-primary" />
			<span class="text-lg font-semibold">Auto Repair</span>
		</div>
	</SidebarHeader>

	<SidebarContent>
		<SidebarGroup>
			<SidebarGroupLabel>Navigation</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{#if isShopUser}
						<SidebarMenuItem>
							<SidebarMenuButton isActive={pathname.startsWith(resolve('/app/shop'))}>
								{#snippet child({ props })}
									<a href={resolve('/app/shop')} {...props}>
										<StoreIcon />
										<span>Shop Dashboard</span>
									</a>
								{/snippet}
							</SidebarMenuButton>
						</SidebarMenuItem>
					{:else}
						<SidebarMenuItem>
							<SidebarMenuButton isActive={pathname === resolve('/app')}>
								{#snippet child({ props })}
									<a href={resolve('/app')} {...props}>
										<LayoutDashboardIcon />
										<span>Dashboard</span>
									</a>
								{/snippet}
							</SidebarMenuButton>
						</SidebarMenuItem>
					{/if}
					<SidebarMenuItem>
						<SidebarMenuButton isActive={pathname.startsWith(resolve('/app/cars'))}>
							{#snippet child({ props })}
								<a href={resolve('/app/cars')} {...props}>
									<CarIcon />
									<span>Cars</span>
								</a>
							{/snippet}
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton isActive={pathname.startsWith(resolve('/app/calendar'))}>
							{#snippet child({ props })}
								<a href={resolve('/app/calendar')} {...props}>
									<CalendarIcon />
									<span>Calendar</span>
								</a>
							{/snippet}
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton isActive={pathname.startsWith(resolve('/app/analytics'))}>
							{#snippet child({ props })}
								<a href={resolve('/app/analytics')} {...props}>
									<BarChart3Icon />
									<span>Analytics</span>
								</a>
							{/snippet}
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	</SidebarContent>

	<SidebarFooter class="border-t border-sidebar-border p-4">
		<div class="flex flex-col gap-3">
			<div class="text-xs text-muted-foreground">
				<div>{repairs.cars.length} Cars</div>
				<div>{repairs.repairs.length} Repairs</div>
			</div>
			{#if user}
				<div class="text-xs">
					<div class="font-medium">{user.name}</div>
					<div class="text-muted-foreground">{user.email}</div>
					{#if user.role}
						<div class="mt-1 text-xs text-primary capitalize">
							{user.role.replace('_', ' ')}
						</div>
					{/if}
				</div>
			{/if}
			<Button variant="outline" size="sm" onclick={handleSignOut} class="w-full">
				<LogOutIcon class="size-4" />
				Sign Out
			</Button>
		</div>
	</SidebarFooter>

	<SidebarRail />
</Sidebar>
