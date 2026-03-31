import {
	PAYMENT_STATUS,
	REPAIR_STATUS,
	REPAIR_STATUS_VALUES,
	type PaymentStatus,
	type RepairStatus
} from '$lib/constants';

export const SHOP_REPAIR_TRANSITIONS = {
	[REPAIR_STATUS.PENDING]: [REPAIR_STATUS.ESTIMATE_PENDING, REPAIR_STATUS.IN_PROGRESS],
	[REPAIR_STATUS.ESTIMATE_PENDING]: [],
	[REPAIR_STATUS.ESTIMATE_APPROVED]: [REPAIR_STATUS.IN_PROGRESS],
	[REPAIR_STATUS.ESTIMATE_REJECTED]: [REPAIR_STATUS.ESTIMATE_PENDING],
	[REPAIR_STATUS.IN_PROGRESS]: [REPAIR_STATUS.COMPLETED],
	[REPAIR_STATUS.COMPLETED]: [],
	[REPAIR_STATUS.PAID]: []
} as const satisfies Record<RepairStatus, readonly RepairStatus[]>;

export function isRepairStatus(status: string): status is RepairStatus {
	return REPAIR_STATUS_VALUES.some((value) => value === status);
}

export function listAllowedRepairTransitions(status: string): readonly RepairStatus[] {
	if (!isRepairStatus(status)) {
		return [];
	}

	return SHOP_REPAIR_TRANSITIONS[status];
}

export function canTransitionRepairStatus(current: string, next: string): boolean {
	if (current === next) {
		return true;
	}

	if (!isRepairStatus(current) || !isRepairStatus(next)) {
		return false;
	}

	return SHOP_REPAIR_TRANSITIONS[current].some((status) => status === next);
}

export function canRecordRepairPayment(status: string): boolean {
	return status === REPAIR_STATUS.COMPLETED || status === REPAIR_STATUS.PAID;
}

export function getRepairPaymentState(
	totalCost: number,
	amountPaid: number
): { paymentStatus: PaymentStatus; status: RepairStatus } {
	if (amountPaid >= totalCost) {
		return {
			paymentStatus: PAYMENT_STATUS.PAID,
			status: REPAIR_STATUS.PAID
		};
	}

	if (amountPaid > 0) {
		return {
			paymentStatus: PAYMENT_STATUS.PARTIAL,
			status: REPAIR_STATUS.COMPLETED
		};
	}

	return {
		paymentStatus: PAYMENT_STATUS.UNPAID,
		status: REPAIR_STATUS.COMPLETED
	};
}
