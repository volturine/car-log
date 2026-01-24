/**
 * Reactive utilities using runed for Svelte 5
 *
 * These utilities enhance Svelte 5's reactive capabilities with
 * common patterns for debouncing, throttling, and state management.
 */

import { useDebounce as runedUseDebounce, useThrottle as runedUseThrottle } from 'runed';

/**
 * Re-export runed's useDebounce
 *
 * @example
 * const search = useDebounce((query: string) => {
 *   // Expensive search operation
 * }, 300);
 */
export { runedUseDebounce as useDebounce };

/**
 * Re-export runed's useThrottle
 *
 * @example
 * const onScroll = useThrottle(() => {
 *   // Handle scroll event
 * }, 100);
 */
export { runedUseThrottle as useThrottle };
