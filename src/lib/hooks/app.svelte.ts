import { MediaQuery } from 'svelte/reactivity';
import { setContext, getContext } from 'svelte';

const THEME_KEY = 'carlog-ui-state';

function prefersDark(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDocumentTheme(dark: boolean) {
	if (typeof document === 'undefined') return;

	const root = document.documentElement;
	root.classList.toggle('dark', dark);
	root.style.colorScheme = dark ? 'dark' : 'light';
	root.style.backgroundColor = dark ? '#0a0a0a' : '#ffffff';
	if (document.body) document.body.style.backgroundColor = dark ? '#0a0a0a' : '#ffffff';
}

class UseApp {
	#dark = $state<boolean | null>(null);
	private systemDark = $state(prefersDark());
	#persistable = false;

	#mobile = new MediaQuery('max-width: 700px');
	isMobile = $derived(this.#mobile.current);

	constructor(props: UseAppProps) {
		if (typeof localStorage !== 'undefined') {
			try {
				const raw = localStorage.getItem(THEME_KEY);
				if (raw) {
					const parsed: unknown = JSON.parse(raw);
					if (
						typeof parsed === 'object' &&
						parsed !== null &&
						'dark' in parsed &&
						(typeof parsed.dark === 'boolean' || parsed.dark === null)
					) {
						this.#dark = parsed.dark;
					}
				}
			} catch {
				// Ignore malformed local UI state.
			}

			if (this.#dark === null) {
				const legacyTheme = localStorage.getItem('theme');
				if (legacyTheme === 'dark') this.#dark = true;
				if (legacyTheme === 'light') this.#dark = false;
			}
		} else if (typeof window === 'undefined') {
			this.#dark = props.isDarkMode;
		}

		this.#persistable = true;
		applyDocumentTheme(this.effectiveDark);

		if (typeof matchMedia !== 'undefined') {
			const media = matchMedia('(prefers-color-scheme: dark)');
			media.addEventListener?.('change', (event) => {
				this.systemDark = event.matches;
				if (this.#dark === null) applyDocumentTheme(event.matches);
			});
		}
	}

	get isDarkMode() {
		return this.effectiveDark;
	}

	set isDarkMode(value: boolean) {
		this.#dark = value;
		this.persist();
		applyDocumentTheme(this.effectiveDark);
	}

	get effectiveDark(): boolean {
		return this.#dark ?? this.systemDark;
	}

	private persist() {
		if (!this.#persistable || typeof localStorage === 'undefined') return;
		localStorage.setItem(THEME_KEY, JSON.stringify({ dark: this.#dark }));
	}

	darkModeToggle = () => (this.isDarkMode = !this.effectiveDark);
}

export type UseAppProps = Pick<UseApp, 'isDarkMode'>;

export const setApp = (props: UseAppProps) => {
	const instance = new UseApp(props);
	setContext('appState', instance);
	return instance;
};

export const useApp = () => getContext<UseApp>('appState');
