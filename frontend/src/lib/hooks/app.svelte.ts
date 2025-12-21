import { MediaQuery } from "svelte/reactivity";
import { setContext, getContext } from "svelte";

/** App state class-base management */
class UseApp {
	isDarkMode = $state(false);
	isMobile = $derived(new MediaQuery("max-width: 700px").current);

	// Set default data
	constructor(props: { [key: string]: any }) {
		// Merge props into this instance
		Object.assign(this, props);
		// Add and remove dark class to body whenever `isDarkMode` changes
		$effect(() => {
			document.body.classList.toggle("dark", this.isDarkMode);
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