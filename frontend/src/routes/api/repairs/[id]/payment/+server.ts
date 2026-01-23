import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireAuth, validateBody, successResponse, transaction, isShopMember } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { REPAIR_STATUS, PAYMENT_STATUS } from '$lib/constants';
import { notifyPaymentReceived } from '$lib/server/notifications';
import { z } from 'zod';

const logger = apiLogger.child('payments');

const paymentSchema = z.object({
	amount: z.number().min(0),
	method: z.string().optional(), // cash, card, check, etc.
	notes: z.string().optional()
});

// POST /api/repairs/[id]/payment - Record a payment
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	// Get repair
	const [repair] = await db
		.select()
		.from(schema.repairs)
		.where(eq(schema.repairs.id, params.id))
		.limit(1);

	if (!repair) {
		throw error(404, 'Repair not found');
	}

	// Only shop members or the repair owner can record payments
	// Typically shops record payments when customers pay
	const isShop = isShopMember(user);
	const isOwner = repair.userId === user.id;

	if (!isShop && !isOwner) {
		throw error(403, 'You do not have permission to record payments for this repair');
	}

	// For shop users, verify they have access to the repair's shop
	if (isShop && repair.shopId) {
		const [membership] = await db
			.select()
			.from(schema.shopMembers)
			.where(
				eq(schema.shopMembers.shopId, repair.shopId) &&
					eq(schema.shopMembers.userId, user.id)
			)
			.limit(1);

		if (!membership && user.role !== 'admin') {
			throw error(403, 'You do not have access to this shop');
		}
	}

	const { amount, method, notes } = await validateBody(request, paymentSchema);

	if (amount <= 0) {
		throw error(400, 'Payment amount must be greater than 0');
	}

	logger.info('Recording payment', { repairId: params.id, userId: user.id, amount });

	const result = await transaction(async () => {
		const newAmountPaid = repair.amountPaid + amount;
		const remainingBalance = repair.totalCost - newAmountPaid;

		let paymentStatus = PAYMENT_STATUS.PARTIAL;
		let repairStatus = repair.status;

		if (remainingBalance <= 0) {
			paymentStatus = PAYMENT_STATUS.PAID;
			// If fully paid and completed, mark as paid status
			if (repair.status === REPAIR_STATUS.COMPLETED) {
				repairStatus = REPAIR_STATUS.PAID;
			}
		} else if (newAmountPaid <= 0) {
			paymentStatus = PAYMENT_STATUS.UNPAID;
		}

		const updatedRepair = {
			amountPaid: newAmountPaid,
			paymentStatus,
			status: repairStatus,
			updatedAt: new Date()
		};

		await db
			.update(schema.repairs)
			.set(updatedRepair)
			.where(eq(schema.repairs.id, params.id));

		// Notify shop owner if customer made payment, or vice versa
		if (repair.shopId && isOwner) {
			const [shop] = await db
				.select()
				.from(schema.shops)
				.where(eq(schema.shops.id, repair.shopId))
				.limit(1);

			if (shop) {
				await notifyPaymentReceived(
					shop.ownerId,
					params.id,
					amount,
					user.name || 'Customer'
				);
			}
		}

		logger.info('Payment recorded', {
			repairId: params.id,
			amount,
			newTotal: newAmountPaid,
			paymentStatus
		});

		return {
			...repair,
			...updatedRepair,
			paymentDetails: {
				amount,
				method: method || 'not specified',
				notes: notes || null,
				recordedBy: user.id,
				recordedAt: new Date()
			}
		};
	});

	return json(successResponse(result, 201), { status: 201 });
};
