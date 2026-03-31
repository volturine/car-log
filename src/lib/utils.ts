import { DATE_FORMATS } from '$lib/constants';
import type { Car } from '$lib/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const usd = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD'
});

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export function formatDate(date: Date | string | null | undefined): string {
	if (!date) return '';

	const value = typeof date === 'string' ? new Date(date) : date;

	if (Number.isNaN(value.getTime())) return '';

	return value.toLocaleDateString('en-US', DATE_FORMATS.DISPLAY);
}

export function formatCurrency(amount: number): string {
	return usd.format(amount);
}

export function generateId(): string {
	return crypto.randomUUID();
}

export function toError(value: unknown): Error {
	if (value instanceof Error) return value;
	return new Error(String(value));
}

export function carLabel(cars: Car[], carId: string): string {
	const car = cars.find((c) => c.id === carId);
	if (!car) return 'Unknown vehicle';
	return `${car.brand} ${car.model} — ${car.licensePlate}`;
}
