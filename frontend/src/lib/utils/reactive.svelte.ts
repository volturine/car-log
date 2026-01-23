/**
 * Reactive utilities using runed for Svelte 5
 *
 * These utilities enhance Svelte 5's reactive capabilities with
 * common patterns for debouncing, throttling, and state management.
 */

import { debounce, throttle } from 'runed';
import { onMount } from 'svelte';

/**
 * Create a debounced reactive function
 *
 * @example
 * const search = useDebounce((query: string) => {
 *   // Expensive search operation
 * }, 300);
 */
export function useDebounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	return debounce(fn, delay);
}

/**
 * Create a throttled reactive function
 *
 * @example
 * const onScroll = useThrottle(() => {
 *   // Handle scroll event
 * }, 100);
 */
export function useThrottle<T extends (...args: any[]) => any>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	return throttle(fn, delay);
}

/**
 * Create a reactive media query matcher
 *
 * @example
 * let isMobile = $derived(useMediaQuery('(max-width: 768px)'));
 */
export function useMediaQuery(query: string): boolean {
	let matches = $state(false);

	onMount(() => {
		const mediaQuery = window.matchMedia(query);
		matches = mediaQuery.matches;

		const handler = (e: MediaQueryListEvent) => {
			matches = e.matches;
		};

		mediaQuery.addEventListener('change', handler);

		return () => {
			mediaQuery.removeEventListener('change', handler);
		};
	});

	return matches;
}

/**
 * Create a reactive localStorage synced state
 *
 * @example
 * let theme = useLocalStorage('theme', 'light');
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
	let stored = $state<T>(initialValue);

	onMount(() => {
		// Load from localStorage
		const item = localStorage.getItem(key);
		if (item !== null) {
			try {
				stored = JSON.parse(item);
			} catch {
				stored = initialValue;
			}
		}

		// Watch for changes and sync
		const handler = () => {
			const item = localStorage.getItem(key);
			if (item !== null) {
				try {
					stored = JSON.parse(item);
				} catch {
					stored = initialValue;
				}
			}
		};

		window.addEventListener('storage', handler);

		return () => {
			window.removeEventListener('storage', handler);
		};
	});

	// Create effect to save to localStorage when stored changes
	$effect(() => {
		localStorage.setItem(key, JSON.stringify(stored));
	});

	return stored;
}

/**
 * Create a reactive interval
 *
 * @example
 * let count = useInterval(1000); // Increments every second
 */
export function useInterval(delay: number) {
	let count = $state(0);

	onMount(() => {
		const interval = setInterval(() => {
			count++;
		}, delay);

		return () => clearInterval(interval);
	});

	return count;
}
