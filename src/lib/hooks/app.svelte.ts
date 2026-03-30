import { MediaQuery } from "svelte/reactivity";
import { setContext, getContext } from "svelte";

/** App state class-base management */
class UseApp {
	isDarkMode = $state(false);
	isMobile = $derived(new MediaQuery("max-width: 700px").current);

	// Set default data
	constructor(props: { [key: string]: any }) {
		// Load theme from localStorage on init
		if (typeof window !== 'undefined') {
			const savedTheme = localStorage.getItem('theme');
			if (savedTheme === 'dark') {
				this.isDarkMode = true;
			} else if (savedTheme === 'light') {
				this.isDarkMode = false;
			} else {
				// Merge props into this instance if no saved theme
				Object.assign(this, props);
			}
		} else {
			// Merge props into this instance (SSR)
			Object.assign(this, props);
		}

		// Add and remove dark class to body whenever `isDarkMode` changes
		$effect(() => {
			document.body.classList.toggle("dark", this.isDarkMode);
			// Persist theme to localStorage
			if (typeof window !== 'undefined') {
				localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
			}
		});
	}

	/** Toggle isDarkMode */
	darkModeToggle = () => (this.isDarkMode = !this.isDarkMode);
}

/** Hook props (isDarkMode can be set when setting hook) */
export type UseAppProps = Pick<InstanceType<typeof UseApp>, "isDarkMode">;

/** Set app state */
export const setApp = (props: UseAppProps) => setContext("appState", new UseApp(props));

/** Use app state */
export const useApp = () => getContext<ReturnType<typeof setApp>>("appState");