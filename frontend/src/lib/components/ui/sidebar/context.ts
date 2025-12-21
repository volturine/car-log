import { getContext, setContext } from 'svelte';

const SIDEBAR_KEY = Symbol('sidebar-context');

class SidebarController {
	isOpen = $state(true);

	toggle = () => {
		this.isOpen = !this.isOpen;
	};

	open = () => {
		this.isOpen = true;
	};

	close = () => {
		this.isOpen = false;
	};
}

export type SidebarContext = SidebarController;

export const createSidebarContext = () => {
	const controller = new SidebarController();
	setContext<SidebarContext>(SIDEBAR_KEY, controller);
	return controller;
};

export const useSidebar = () => {
	const controller = getContext<SidebarContext>(SIDEBAR_KEY);
	if (!controller) {
		throw new Error('useSidebar must be used inside a <SidebarProvider>.');
	}
	return controller;
};
