import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireAuth, verifyOwnership, successResponse, transaction } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { REPAIR_STATUS } from '$lib/constants';
import { notifyEstimateApproved } from '$lib/server/notifications';

const logger = apiLogger.child('repairs');

// POST /api/repairs/[id]/approve - Approve an estimate
export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	// Verify repair belongs to user (customer)
	const repair = await verifyOwnership(schema.repairs, params.id, user.id, 'Repair');

	// Check if repair is in estimate_pending status
	if (repair.status !== REPAIR_STATUS.ESTIMATE_PENDING) {
		throw error(400, 'Only pending estimates can be approved');
	}

	logger.info('Approving estimate', { repairId: params.id, userId: user.id });

	const result = await transaction(async () => {
		// Update repair status
		const updatedRepair = {
			status: REPAIR_STATUS.ESTIMATE_APPROVED,
			customerApproved: true,
			approvedAt: new Date(),
			updatedAt: new Date()
		};

		await db
			.update(schema.repairs)
			.set(updatedRepair)
			.where(eq(schema.repairs.id, params.id));

		// Get shop info to notify
		if (repair.shopId) {
			const [shop] = await db
				.select()
				.from(schema.shops)
				.where(eq(schema.shops.id, repair.shopId))
				.limit(1);

			if (shop) {
				// Notify shop owner
				await notifyEstimateApproved(shop.ownerId, params.id, user.name || 'Customer');
			}
		}

		return { ...repair, ...updatedRepair };
	});

	logger.info('Estimate approved', { repairId: params.id, userId: user.id });

	return json(successResponse(result));
};
