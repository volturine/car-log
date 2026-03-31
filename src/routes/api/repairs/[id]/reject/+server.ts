import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import {
	requireAuth,
	verifyOwnership,
	validateBody,
	successResponse,
	transaction
} from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { REPAIR_STATUS } from '$lib/constants';
import { notifyEstimateRejected } from '$lib/server/notifications';
import { z } from 'zod';

const logger = apiLogger.child('repairs');

const rejectSchema = z.object({
	reason: z.string().optional()
});

// POST /api/repairs/[id]/reject - Reject an estimate
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	// Verify repair belongs to user (customer)
	const repair = await verifyOwnership(schema.repairs, params.id, user.id, 'Repair');

	// Check if repair is in estimate_pending status
	if (repair.status !== REPAIR_STATUS.ESTIMATE_PENDING) {
		throw error(400, 'Only pending estimates can be rejected');
	}

	const { reason } = await validateBody(request, rejectSchema);

	logger.info('Rejecting estimate', { repairId: params.id, userId: user.id, reason });

	const updatedRepair = transaction((tx) => {
		const repairUpdate = {
			estimateNotes: reason ? `Rejected: ${reason}` : 'Estimate rejected by customer',
			customerApproved: false,
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

	return json(successResponse(result));
};
