import { describe, expect, it } from 'vitest';
import {
	PAYMENT_STATUS,
	REPAIR_STATUS,
	REPAIR_STATUS_VALUES,
	SHOP_STATUS_TRANSITIONS
} from '$lib/constants';
import {
	canRecordRepairPayment,
	canTransitionRepairStatus,
	getRepairPaymentState,
	isRepairStatus,
	listAllowedRepairTransitions
} from './repair-workflow';

describe('isRepairStatus', () => {
	it('returns true for every valid status', () => {
		for (const status of REPAIR_STATUS_VALUES) {
			expect(isRepairStatus(status)).toBe(true);
		}
	});

	it('returns false for invalid strings', () => {
		expect(isRepairStatus('unknown')).toBe(false);
		expect(isRepairStatus('')).toBe(false);
		expect(isRepairStatus('COMPLETED')).toBe(false);
	});
});

describe('SHOP_STATUS_TRANSITIONS', () => {
	it('has an entry for every repair status', () => {
		for (const status of REPAIR_STATUS_VALUES) {
			expect(SHOP_STATUS_TRANSITIONS).toHaveProperty(status);
		}
	});

	it('only contains valid statuses as targets', () => {
		for (const targets of Object.values(SHOP_STATUS_TRANSITIONS)) {
			for (const target of targets) {
				expect(isRepairStatus(target)).toBe(true);
			}
		}
	});
});

describe('listAllowedRepairTransitions', () => {
	it('returns transitions for pending', () => {
		const allowed = listAllowedRepairTransitions(REPAIR_STATUS.PENDING);
		expect(allowed).toContain(REPAIR_STATUS.ESTIMATE_PENDING);
		expect(allowed).toContain(REPAIR_STATUS.IN_PROGRESS);
	});

	it('returns empty for terminal statuses', () => {
		expect(listAllowedRepairTransitions(REPAIR_STATUS.COMPLETED)).toEqual([]);
		expect(listAllowedRepairTransitions(REPAIR_STATUS.PAID)).toEqual([]);
	});

	it('returns empty for invalid status', () => {
		expect(listAllowedRepairTransitions('bogus')).toEqual([]);
	});

	it('allows estimate_rejected to go back to estimate_pending', () => {
		const allowed = listAllowedRepairTransitions(REPAIR_STATUS.ESTIMATE_REJECTED);
		expect(allowed).toContain(REPAIR_STATUS.ESTIMATE_PENDING);
	});
});

describe('canTransitionRepairStatus', () => {
	it('allows same-status transitions', () => {
		expect(canTransitionRepairStatus(REPAIR_STATUS.IN_PROGRESS, REPAIR_STATUS.IN_PROGRESS)).toBe(
			true
		);
	});

	it('allows valid forward transitions', () => {
		expect(canTransitionRepairStatus(REPAIR_STATUS.IN_PROGRESS, REPAIR_STATUS.COMPLETED)).toBe(
			true
		);
		expect(
			canTransitionRepairStatus(REPAIR_STATUS.ESTIMATE_APPROVED, REPAIR_STATUS.IN_PROGRESS)
		).toBe(true);
	});

	it('rejects invalid transitions', () => {
		expect(canTransitionRepairStatus(REPAIR_STATUS.COMPLETED, REPAIR_STATUS.PENDING)).toBe(false);
		expect(canTransitionRepairStatus(REPAIR_STATUS.PAID, REPAIR_STATUS.IN_PROGRESS)).toBe(false);
	});

	it('rejects invalid status strings', () => {
		expect(canTransitionRepairStatus('bad', REPAIR_STATUS.COMPLETED)).toBe(false);
		expect(canTransitionRepairStatus(REPAIR_STATUS.COMPLETED, 'bad')).toBe(false);
		expect(canTransitionRepairStatus('bad', 'worse')).toBe(false);
	});
});

describe('canRecordRepairPayment', () => {
	it('allows payments for completed repairs', () => {
		expect(canRecordRepairPayment(REPAIR_STATUS.COMPLETED)).toBe(true);
	});

	it('allows payments for paid repairs', () => {
		expect(canRecordRepairPayment(REPAIR_STATUS.PAID)).toBe(true);
	});

	it('rejects payments for in-progress repairs', () => {
		expect(canRecordRepairPayment(REPAIR_STATUS.IN_PROGRESS)).toBe(false);
	});

	it('rejects payments for pending repairs', () => {
		expect(canRecordRepairPayment(REPAIR_STATUS.PENDING)).toBe(false);
		expect(canRecordRepairPayment(REPAIR_STATUS.ESTIMATE_PENDING)).toBe(false);
	});
});

describe('getRepairPaymentState', () => {
	it('returns paid when amount equals total cost', () => {
		const result = getRepairPaymentState(100, 100);
		expect(result.paymentStatus).toBe(PAYMENT_STATUS.PAID);
		expect(result.status).toBe(REPAIR_STATUS.PAID);
	});

	it('returns paid when overpaid', () => {
		const result = getRepairPaymentState(100, 150);
		expect(result.paymentStatus).toBe(PAYMENT_STATUS.PAID);
		expect(result.status).toBe(REPAIR_STATUS.PAID);
	});

	it('returns partial for partial payments', () => {
		const result = getRepairPaymentState(100, 50);
		expect(result.paymentStatus).toBe(PAYMENT_STATUS.PARTIAL);
		expect(result.status).toBe(REPAIR_STATUS.COMPLETED);
	});

	it('returns unpaid when no payment made', () => {
		const result = getRepairPaymentState(100, 0);
		expect(result.paymentStatus).toBe(PAYMENT_STATUS.UNPAID);
		expect(result.status).toBe(REPAIR_STATUS.COMPLETED);
	});

	it('handles zero-cost repairs as paid', () => {
		const result = getRepairPaymentState(0, 0);
		expect(result.paymentStatus).toBe(PAYMENT_STATUS.PAID);
		expect(result.status).toBe(REPAIR_STATUS.PAID);
	});
});
