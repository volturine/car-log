/**
 * Helper utility functions for common operations
 * Reduces code duplication across components and API routes
 */

import { DATE_FORMATS } from '$lib/constants';
import type { RepairPart } from '$lib/types';

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
 * Calculate total cost from parts
 */
export function calculatePartsCost(parts: RepairPart[]): number {
	return parts.reduce((sum, part) => sum + (part.totalCost || 0), 0);
}

/**
 * Calculate hourly rate from labor cost and hours
 */
export function calculateHourlyRate(laborCost: number, laborHours: number): number {
	if (!laborHours || laborHours === 0) return 0;
	return laborCost / laborHours;
}

/**
 * Calculate total repair cost (parts + labor)
 */
export function calculateTotalRepairCost(parts: RepairPart[], laborCost: number): number {
	const partsCost = calculatePartsCost(parts);
	return partsCost + laborCost;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str;
	return str.slice(0, maxLength - 3) + '...';
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
	try {
		return JSON.parse(json) as T;
	} catch {
		return fallback;
	}
}

/**
 * Generate UUID v4
 */
export function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			timeout = null;
			func(...args);
		};

		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

/**
 * Pluralize word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
	if (count === 1) return singular;
	return plural || `${singular}s`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
	if (total === 0) return 0;
	return Math.round((value / total) * 100);
}

/**
 * Group array by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
	return array.reduce(
		(groups, item) => {
			const groupKey = String(item[key]);
			if (!groups[groupKey]) {
				groups[groupKey] = [];
			}
			groups[groupKey].push(item);
			return groups;
		},
		{} as Record<string, T[]>
	);
}

/**
 * Sort array by date (newest first)
 */
export function sortByDateDesc<T extends { createdAt: Date | string }>(items: T[]): T[] {
	return items.sort((a, b) => {
		const dateA = new Date(a.createdAt).getTime();
		const dateB = new Date(b.createdAt).getTime();
		return dateB - dateA;
	});
}

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
 * Sleep/delay utility for testing
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
