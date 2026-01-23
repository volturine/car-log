<script lang="ts">
	import { useRepairs } from '$lib/hooks/repairs.svelte.js';
	import { signOut } from '$lib/auth-client';
	import { goto } from '$app/navigation';
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
		StoreIcon
	} from '@lucide/svelte';
	import { USER_ROLE } from '$lib/constants';

	const repairs = useRepairs();

	let { user }: { user?: { name: string; email: string; role?: string } } = $props();

	let isShopUser = $derived(
		user?.role === USER_ROLE.SHOP_OWNER || user?.role === USER_ROLE.MECHANIC
	);

	async function handleSignOut() {
		await signOut();
		goto('/auth/login');
	}
</script>

<Sidebar collapsible="offcanvas">
	<SidebarHeader class="border-b border-sidebar-border h-14 flex-row items-center px-4">
		<div class="flex items-center gap-2">
			<WrenchIcon class="size-6 text-primary" />
			<span class="font-semibold text-lg">Auto Repair</span>
		</div>
	</SidebarHeader>

	<SidebarContent>
		<SidebarGroup>
			<SidebarGroupLabel>Navigation</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{#if isShopUser}
						<SidebarMenuItem>
							<SidebarMenuButton
								isActive={repairs.currentView === 'shop-dashboard'}
								onclick={() => repairs.goToShopDashboard()}
							>
								<StoreIcon />
								<span>Shop Dashboard</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					{/if}
					<SidebarMenuItem>
						<SidebarMenuButton
							isActive={repairs.currentView === 'cars'}
							onclick={() => repairs.goToCars()}
						>
							<CarIcon />
							<span>Cars</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton
							isActive={repairs.currentView === 'calendar'}
							onclick={() => repairs.goToCalendar()}
						>
							<CalendarIcon />
							<span>Calendar</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton
							isActive={repairs.currentView === 'analytics'}
							onclick={() => repairs.goToAnalytics()}
						>
							<BarChart3Icon />
							<span>Analytics</span>
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
						<div class="text-xs text-primary mt-1 capitalize">
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
