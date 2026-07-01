import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Result } from 'neverthrow';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import {
	requireAuth,
	validateBody,
	transaction,
	formatPhotosForResponse,
	verifyRepairAccess,
	isShopMember,
	getMechanic,
	fetchById,
	ok,
	err
} from '$lib/server/api-utils';
import { repairSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils';
import { cleanupPhotoFiles } from '$lib/server/storage';
import { USER_ROLE } from '$lib/constants';
import { listPayments } from '$lib/server/payments';
import {
	canTransitionRepairStatus,
	listAllowedRepairTransitions
} from '$lib/server/repair-workflow';
import type { z } from 'zod';

const logger = apiLogger.child('repairs');
type RepairInput = Partial<z.infer<typeof repairSchema>>;
type RepairUpdate = Partial<typeof schema.repairs.$inferInsert> & {
	parts?: RepairInput['parts'];
};

function hasKey<T extends object>(obj: T, key: PropertyKey): boolean {
	return Object.prototype.hasOwnProperty.call(obj, key);
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const repairResult = await verifyRepairAccess(params.id, user);
	if (repairResult.isErr()) {
		return json(
			{ success: false, error: repairResult.error.message },
			{ status: repairResult.error.status }
		);
	}

	const repair = repairResult.value;

	const parts = await db
		.select()
		.from(schema.repairParts)
		.where(eq(schema.repairParts.repairId, params.id));

	const photos = await db.select().from(schema.photos).where(eq(schema.photos.repairId, params.id));
	const payments = await listPayments(params.id);

	const shopInfo = repair.shopId ? await fetchById(schema.shops, repair.shopId) : null;
	const car = await fetchById(schema.cars, repair.carId);
	const assignedMechanic = await getMechanic(repair.assignedMechanicId);

	return json({
		success: true,
		data: {
			...repair,
			parts,
			payments,
			photos: formatPhotosForResponse(photos),
			shop: shopInfo,
			car: car || null,
			assignedMechanic
		}
	});
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const repairResult = await verifyRepairAccess(params.id, user);
	if (repairResult.isErr()) {
		return json(
			{ success: false, error: repairResult.error.message },
			{ status: repairResult.error.status }
		);
	}

	const repair = repairResult.value;
	const isShop = isShopMember(user);

	const validationErr = await validateBody(request, repairSchema.partial());
	if (validationErr.isErr()) {
		return json({ success: false, error: validationErr.error.message }, { status: 400 });
	}

	const validatedData = validationErr.value;

	logger.info('Updating repair', { repairId: params.id, userId: user.id });

	if (!isShop && repair.shopId) {
		return json({ success: false, error: 'Only the shop can update this repair' }, { status: 403 });
	}

	if (isShop) {
		const transitionErr = assertShopRepairTransition(repair.status, validatedData.status);
		if (transitionErr.isErr()) {
			return json({ success: false, error: transitionErr.error.message }, { status: 400 });
		}
	}

	const updates = isShop
		? getShopRepairUpdate(validatedData)
		: getCustomerRepairUpdate(validatedData);
	const { parts, ...repairUpdates } = updates;

	const updatedRepair = {
		...repair,
		...repairUpdates,
		updatedAt: new Date()
	};

	const result = transaction((tx) => {
		tx.update(schema.repairs).set(updatedRepair).where(eq(schema.repairs.id, params.id)).run();

		if (isShop && parts) {
			tx.delete(schema.repairParts).where(eq(schema.repairParts.repairId, params.id)).run();
			parts.forEach((part) => {
				tx.insert(schema.repairParts)
					.values({
						id: generateId(),
						repairId: params.id,
						...part,
						totalCost: part.totalCost ?? part.quantity * part.unitCost,
						createdAt: new Date()
					})
					.run();
			});
		}

		return { ...updatedRepair, id: params.id };
	});

	const updatedParts = await db
		.select()
		.from(schema.repairParts)
		.where(eq(schema.repairParts.repairId, params.id));

	logger.info('Repair updated', { repairId: params.id, userId: user.id });

	return json({ success: true, data: { ...result, parts: updatedParts } });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const repairResult = await verifyRepairAccess(params.id, user);
	if (repairResult.isErr()) {
		return json(
			{ success: false, error: repairResult.error.message },
			{ status: repairResult.error.status }
		);
	}

	const repair = repairResult.value;

	if (
		repair.userId !== user.id &&
		user.role !== USER_ROLE.ADMIN &&
		user.role !== USER_ROLE.SHOP_OWNER
	) {
		return json(
			{
				success: false,
				error: 'Only the repair owner, shop owner, or admin can delete this repair'
			},
			{ status: 403 }
		);
	}

	logger.info('Deleting repair', { repairId: params.id, userId: user.id });

	const photos = await db.select().from(schema.photos).where(eq(schema.photos.repairId, params.id));

	await db.delete(schema.repairs).where(eq(schema.repairs.id, params.id));

	await cleanupPhotoFiles(photos);

	logger.info('Repair deleted', {
		repairId: params.id,
		userId: user.id,
		photosCleaned: photos.length
	});

	return json({ success: true, data: { deleted: true } });
};

function getShopRepairUpdate(data: RepairInput): RepairUpdate {
	const next: RepairUpdate = {};

	if (hasKey(data, 'carId') && typeof data.carId === 'string') {
		next.carId = data.carId;
	}

	if (hasKey(data, 'shopId')) {
		next.shopId = data.shopId ?? null;
	}

	if (hasKey(data, 'assignedMechanicId')) {
		next.assignedMechanicId = data.assignedMechanicId ?? null;
	}

	if (hasKey(data, 'title') && typeof data.title === 'string') {
		next.title = data.title;
	}

	if (hasKey(data, 'description')) {
		next.description = data.description ?? null;
	}

	if (hasKey(data, 'status') && typeof data.status === 'string') {
		next.status = data.status;
	}

	if (hasKey(data, 'estimatedCost') && typeof data.estimatedCost === 'number') {
		next.estimatedCost = data.estimatedCost;
	}

	if (hasKey(data, 'estimatedHours') && typeof data.estimatedHours === 'number') {
		next.estimatedHours = data.estimatedHours;
	}

	if (hasKey(data, 'estimateNotes')) {
		next.estimateNotes = data.estimateNotes ?? null;
	}

	if (hasKey(data, 'laborCost') && typeof data.laborCost === 'number') {
		next.laborCost = data.laborCost;
	}

	if (hasKey(data, 'laborHours') && typeof data.laborHours === 'number') {
		next.laborHours = data.laborHours;
	}

	if (hasKey(data, 'totalCost') && typeof data.totalCost === 'number') {
		next.totalCost = data.totalCost;
	}

	if (hasKey(data, 'appointmentAt')) {
		next.appointmentAt = data.appointmentAt ? new Date(data.appointmentAt) : null;
	}

	if (hasKey(data, 'startDate')) {
		next.startDate = data.startDate ? new Date(data.startDate) : null;
	}

	if (hasKey(data, 'completedDate')) {
		next.completedDate = data.completedDate ? new Date(data.completedDate) : null;
	}

	if (hasKey(data, 'parts')) {
		next.parts = data.parts;
	}

	return next;
}

function getCustomerRepairUpdate(data: RepairInput): RepairUpdate {
	const next: RepairUpdate = {};

	if (typeof data.title === 'string') {
		next.title = data.title;
	}

	if (typeof data.description === 'string' || data.description === null) {
		next.description = data.description ?? null;
	}

	return next;
}

function assertShopRepairTransition(
	current: string,
	next: RepairInput['status']
): Result<void, { message: string; status: number }> {
	if (typeof next !== 'string') {
		return ok();
	}

	if (canTransitionRepairStatus(current, next)) {
		return ok();
	}

	const allowed = listAllowedRepairTransitions(current);
	const tail = allowed.length > 0 ? ` Allowed next statuses: ${allowed.join(', ')}.` : '';

	return err({
		message: `Invalid repair status transition from ${current} to ${next}.${tail}`,
		status: 400
	});
}
