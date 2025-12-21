import { MediaQuery } from "svelte/reactivity";
import { setContext, getContext } from "svelte";

export type UseAppProps = {
	isDarkMode?: boolean;
};

/** App state class-base management */
class UseApp {
	isDarkMode = $state(false);
	isMobile = $derived(new MediaQuery("max-width: 700px").current);

	// Set default data
	constructor(props: UseAppProps = {}) {
		const stored = typeof window !== "undefined" ? localStorage.getItem("theme:dark") : null;
		const systemPrefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
		const initialDark = props.isDarkMode ?? (stored === "true" ? true : stored === "false" ? false : systemPrefersDark);
		Object.assign(this, { isDarkMode: initialDark, ...props });
		$effect(() => {
			if (typeof document === "undefined") return;
			document.body.classList.toggle("dark", this.isDarkMode);
			document.documentElement.classList.toggle("dark", this.isDarkMode);
			localStorage.setItem("theme:dark", String(this.isDarkMode));
		});
	}

	/** Toggle isDarkMode */
	darkModeToggle = () => (this.isDarkMode = !this.isDarkMode);
}

/** Set app state */
export const setApp = (props: UseAppProps) => setContext("appState", new UseApp(props));

/** Use app state */
export const useApp = () => getContext<ReturnType<typeof setApp>>("appState");