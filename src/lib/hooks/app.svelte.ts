import { MediaQuery } from 'svelte/reactivity';
import { setContext, getContext } from 'svelte';

class UseApp {
	isDarkMode = $state(false);

	#mobile = new MediaQuery('max-width: 700px');
	isMobile = $derived(this.#mobile.current);

	constructor(props: UseAppProps) {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('theme');
			if (saved === 'dark') {
				this.isDarkMode = true;
			} else if (saved === 'light') {
				this.isDarkMode = false;
			} else {
				this.isDarkMode = props.isDarkMode;
			}
		} else {
			this.isDarkMode = props.isDarkMode;
		}

		// Side effect: sync dark class + localStorage with reactive state
		$effect(() => {
			document.body.classList.toggle('dark', this.isDarkMode);
			localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
		});
	}

	darkModeToggle = () => (this.isDarkMode = !this.isDarkMode);
}

export type UseAppProps = Pick<UseApp, 'isDarkMode'>;

export const setApp = (props: UseAppProps) => {
	const instance = new UseApp(props);
	setContext('appState', instance);
	return instance;
};

export const useApp = () => getContext<UseApp>('appState');
