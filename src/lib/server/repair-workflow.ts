import {
	PAYMENT_STATUS,
	REPAIR_STATUS,
	REPAIR_STATUS_VALUES,
	SHOP_STATUS_TRANSITIONS,
	type PaymentStatus,
	type RepairStatus
} from '$lib/constants';

export function isRepairStatus(status: string): status is RepairStatus {
	return REPAIR_STATUS_VALUES.some((value) => value === status);
}

export function listAllowedRepairTransitions(status: string): readonly RepairStatus[] {
	if (!isRepairStatus(status)) {
		return [];
	}

	return SHOP_STATUS_TRANSITIONS[status];
}

export function canTransitionRepairStatus(current: string, next: string): boolean {
	if (current === next) {
		return true;
	}

	if (!isRepairStatus(current) || !isRepairStatus(next)) {
		return false;
	}

	return SHOP_STATUS_TRANSITIONS[current].some((status) => status === next);
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
