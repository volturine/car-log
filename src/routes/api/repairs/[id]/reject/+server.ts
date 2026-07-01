import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireAuth, verifyOwnership, validateBody, transaction } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { REPAIR_STATUS } from '$lib/constants';
import { notifyEstimateRejected } from '$lib/server/notifications';
import { z } from 'zod';

const logger = apiLogger.child('repairs');

const rejectSchema = z.object({
	reason: z.string().optional()
});

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const ownershipResult = await verifyOwnership(schema.repairs, params.id, user.id, 'Repair');
	if (ownershipResult.isErr()) {
		return json(
			{ success: false, error: ownershipResult.error.message },
			{ status: ownershipResult.error.status }
		);
	}

	const repair = ownershipResult.value;

	if (repair.status !== REPAIR_STATUS.ESTIMATE_PENDING) {
		return json(
			{ success: false, error: 'Only pending estimates can be rejected' },
			{ status: 400 }
		);
	}

	const validationErr = await validateBody(request, rejectSchema);
	if (validationErr.isErr()) {
		return json({ success: false, error: validationErr.error.message }, { status: 400 });
	}

	const { reason } = validationErr.value;

	logger.info('Rejecting estimate', { repairId: params.id, userId: user.id, reason });

	const updatedRepair = transaction((tx) => {
		const repairUpdate = {
			status: REPAIR_STATUS.ESTIMATE_REJECTED,
			estimateNotes: reason ? `Rejected: ${reason}` : 'Estimate rejected by customer',
			customerApproved: false,
			approvedAt: null,
			updatedAt: new Date()
		};

		tx.update(schema.repairs).set(repairUpdate).where(eq(schema.repairs.id, params.id)).run();

		return repairUpdate;
	});

	const result = { ...repair, ...updatedRepair };

	if (repair.shopId) {
		const [shop] = await db
			.select()
			.from(schema.shops)
			.where(eq(schema.shops.id, repair.shopId))
			.limit(1);

		if (shop) {
			await notifyEstimateRejected(shop.ownerId, params.id, user.name || 'Customer');
		}
	}

	logger.info('Estimate rejected', { repairId: params.id, userId: user.id });

	return json({ success: true, data: result });
};
