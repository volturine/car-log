import { describe, expect, it } from 'vitest';
import {
	formatCurrency,
	formatDate,
	formatDateTime,
	formatRelativeTime,
	generateId
} from './utils';

describe('formatDate', () => {
	it('formats valid dates', () => {
		expect(formatDate('2026-03-31T00:00:00.000Z')).toBe('Mar 31, 2026');
	});

	it('returns an empty string for invalid input', () => {
		expect(formatDate('not-a-date')).toBe('');
		expect(formatDate(null)).toBe('');
	});
});

describe('formatCurrency', () => {
	it('formats usd values', () => {
		expect(formatCurrency(1234.5)).toBe('$1,234.50');
	});
});

describe('formatDateTime', () => {
	it('formats valid date-time values', () => {
		const value = formatDateTime('2026-03-31T14:05:00.000Z');
		expect(value).toContain('Mar');
		expect(value).toContain('31');
		expect(value).toContain('2026');
	});

	it('returns empty for invalid values', () => {
		expect(formatDateTime('bad-date')).toBe('');
	});
});

describe('formatRelativeTime', () => {
	it('handles near-now values', () => {
		const value = formatRelativeTime(new Date());
		expect(['just now', 'in under a minute']).toContain(value);
	});

	it('returns empty for invalid values', () => {
		expect(formatRelativeTime('bad-date')).toBe('');
	});
});

describe('generateId', () => {
	it('returns a uuid', () => {
		expect(generateId()).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		);
	});
});
