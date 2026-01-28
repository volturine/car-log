/**
 * Helper utility functions for common operations
 * Reduces code duplication across components and API routes
 */

import { DATE_FORMATS } from '$lib/constants';

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null | undefined): string {
	if (!date) return '';

	try {
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		return dateObj.toLocaleDateString('en-US', DATE_FORMATS.DISPLAY);
	} catch {
		return '';
	}
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(amount);
}

/**
 * Generate UUID v4
 */
export function generateId(): string {
	return crypto.randomUUID();
}
