import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import {
	requireAuth,
	isShopMember,
	successResponse,
	transaction,
	validateBody,
	verifyRepairAccess
} from '$lib/server/api-utils';
import {
	PAYMENT_METHOD,
	PAYMENT_METHOD_VALUES,
	PAYMENT_STATUS,
	REPAIR_STATUS,
	USER_ROLE,
	VALIDATION_LIMITS,
	type PaymentStatus
} from '$lib/constants';
import { apiLogger } from '$lib/server/logger';
import { notifyPaymentReceived } from '$lib/server/notifications';
import { listPayments } from '$lib/server/payments';
import { memberWhere } from '$lib/server/predicates';
import { generateId } from '$lib/utils';
import { z } from 'zod';

const logger = apiLogger.child('payments');

const paymentSchema = z.object({
	amount: z.number().positive().max(VALIDATION_LIMITS.REPAIR.MAX_COST),
	method: z.enum(PAYMENT_METHOD_VALUES).optional(),
	notes: z.string().trim().max(VALIDATION_LIMITS.PAYMENT.NOTES_MAX_LENGTH).optional()
});

async function verifyPaymentWriteAccess(
	repairId: string,
	user: NonNullable<App.Locals['user']>
): Promise<typeof schema.repairs.$inferSelect> {
	const [repair] = await db
		.select()
		.from(schema.repairs)
		.where(eq(schema.repairs.id, repairId))
		.limit(1);

	if (!repair) {
		throw error(404, 'Repair not found');
	}

	const isAdmin = user.role === USER_ROLE.ADMIN;
	const isShop = isShopMember(user);
	const isOwner = repair.userId === user.id;

	if (!isShop && !isOwner && !isAdmin) {
		throw error(403, 'You do not have permission to record payments for this repair');
	}

	if (!repair.shopId && !isOwner && !isAdmin) {
		throw error(403, 'You do not have permission to record payments for this repair');
	}

	if (!isShop || !repair.shopId) {
		return repair;
	}

	const [membership] = await db
		.select()
		.from(schema.shopMembers)
		.where(memberWhere(repair.shopId, user.id))
		.limit(1);

	if (!membership && !isAdmin) {
		throw error(403, 'You do not have access to this shop');
	}

	return repair;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	await verifyRepairAccess(params.id, user);

	return json(successResponse(await listPayments(params.id)));
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);
	const repair = await verifyPaymentWriteAccess(params.id, user);
	const { amount, method, notes } = await validateBody(request, paymentSchema);
	const payMethod = method ?? PAYMENT_METHOD.CASH;
	const payNotes = notes || null;
	const isOwner = repair.userId === user.id;

	logger.info('Recording payment', { repairId: params.id, userId: user.id, amount });

	const result = transaction((tx) => {
		const amountPaid = repair.amountPaid ?? 0;
		const totalCost = repair.totalCost ?? 0;
		const newAmountPaid = amountPaid + amount;
		const remainingBalance = totalCost - newAmountPaid;
		const now = new Date();

		let paymentStatus: PaymentStatus = PAYMENT_STATUS.PARTIAL;
		let repairStatus = repair.status;

		if (remainingBalance <= 0) {
			paymentStatus = PAYMENT_STATUS.PAID;

			if (repair.status === REPAIR_STATUS.COMPLETED) {
				repairStatus = REPAIR_STATUS.PAID;
			}
		} else if (newAmountPaid <= 0) {
			paymentStatus = PAYMENT_STATUS.UNPAID;
		}

		const payment = {
			id: generateId(),
			repairId: params.id,
			amount,
			method: payMethod,
			notes: payNotes,
			recordedBy: user.id,
			paidAt: now,
			createdAt: now
		} satisfies typeof schema.payments.$inferInsert;

		const updatedRepair = {
			amountPaid: newAmountPaid,
			paymentStatus,
			status: repairStatus,
			updatedAt: now
		} satisfies Partial<typeof schema.repairs.$inferInsert>;

		tx.insert(schema.payments).values(payment).run();
		tx.update(schema.repairs).set(updatedRepair).where(eq(schema.repairs.id, params.id)).run();

		logger.info('Payment recorded', {
			repairId: params.id,
			amount,
			newTotal: newAmountPaid,
			paymentStatus
		});

		return {
			...repair,
			...updatedRepair,
			payment
		};
	});

	if (repair.shopId && isOwner) {
		const [shop] = await db
			.select()
			.from(schema.shops)
			.where(eq(schema.shops.id, repair.shopId))
			.limit(1);

		if (shop) {
			await notifyPaymentReceived(shop.ownerId, params.id, amount, user.name || 'Customer');
		}
	}

	return json(successResponse(result, 201), { status: 201 });
};
