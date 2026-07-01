import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireAuth, verifyOwnership, transaction } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { REPAIR_STATUS } from '$lib/constants';
import { notifyEstimateApproved } from '$lib/server/notifications';

const logger = apiLogger.child('repairs');

export const POST: RequestHandler = async ({ params, locals }) => {
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
			{ success: false, error: 'Only pending estimates can be approved' },
			{ status: 400 }
		);
	}

	logger.info('Approving estimate', { repairId: params.id, userId: user.id });

	const result = transaction((tx) => {
		const updatedRepair = {
			status: REPAIR_STATUS.ESTIMATE_APPROVED,
			customerApproved: true,
			approvedAt: new Date(),
			updatedAt: new Date()
		};

		tx.update(schema.repairs).set(updatedRepair).where(eq(schema.repairs.id, params.id)).run();

		return { ...repair, ...updatedRepair };
	});

	if (repair.shopId) {
		const [shop] = await db
			.select()
			.from(schema.shops)
			.where(eq(schema.shops.id, repair.shopId))
			.limit(1);

		if (shop) {
			await notifyEstimateApproved(shop.ownerId, params.id, user.name || 'Customer');
		}
	}

	logger.info('Estimate approved', { repairId: params.id, userId: user.id });

	return json({ success: true, data: result });
};
