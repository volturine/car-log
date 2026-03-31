import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import {
	requireAuth,
	verifyOwnership,
	validateBody,
	successResponse,
	transaction,
	fetchById,
	formatPhotosForResponse,
	isShopMember,
	verifyShopAccess,
	getMechanic
} from '$lib/server/api-utils';
import { repairSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { PAYMENT_STATUS, REPAIR_STATUS } from '$lib/constants';
import { listPaymentsByRepairIds } from '$lib/server/payments';
import { generateId } from '$lib/utils';
import { error } from '@sveltejs/kit';

const logger = apiLogger.child('repairs');

// GET /api/repairs - List all repairs for the authenticated user
export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals);

	const carId = url.searchParams.get('carId');
	const shopId = url.searchParams.get('shopId');

	logger.debug('Fetching repairs', { userId: user.id, carId, shopId });

	let repairs: Array<typeof schema.repairs.$inferSelect> = [];

	if (isShopMember(user)) {
		// Shop owners/mechanics see repairs for their shop(s)
		if (shopId) {
			// Verify shop access
			await verifyShopAccess(shopId, user.id, user.role || 'customer');

			// Get repairs for specific shop
			if (carId) {
				repairs = await db
					.select()
					.from(schema.repairs)
					.where(and(eq(schema.repairs.shopId, shopId), eq(schema.repairs.carId, carId)));
			} else {
				repairs = await db.select().from(schema.repairs).where(eq(schema.repairs.shopId, shopId));
			}
		} else {
			// Get all repairs for all shops the user is a member of
			const memberships = await db
				.select()
				.from(schema.shopMembers)
				.where(eq(schema.shopMembers.userId, user.id));

			const shopIds = memberships.map((m) => m.shopId);

			if (shopIds.length > 0) {
				// Get repairs for all shops
				repairs = await db
					.select()
					.from(schema.repairs)
					.where(
						shopIds.length === 1
							? eq(schema.repairs.shopId, shopIds[0])
							: // For multiple shops, we need to use OR
								sql`${schema.repairs.shopId} IN ${shopIds}`
					);
			} else {
				repairs = [];
			}
		}
	} else {
		// Customers see repairs for their cars (created by themselves or shops)
		if (carId) {
			// Verify car belongs to user first
			await verifyOwnership(schema.cars, carId, user.id, 'Car');

			repairs = await db
				.select()
				.from(schema.repairs)
				.where(and(eq(schema.repairs.userId, user.id), eq(schema.repairs.carId, carId)));
		} else {
			repairs = await db.select().from(schema.repairs).where(eq(schema.repairs.userId, user.id));
		}
	}

	const repairIds = repairs.map((r) => r.id);
	const shopIds = Array.from(
		new Set(repairs.map((r) => r.shopId).filter((id): id is string => Boolean(id)))
	);
	const carIds = Array.from(new Set(repairs.map((r) => r.carId)));
	const mechanicIds = Array.from(
		new Set(repairs.map((r) => r.assignedMechanicId).filter((id): id is string => Boolean(id)))
	);

	const [parts, photos, payments, shops, cars, mechanics] = await Promise.all([
		repairIds.length > 0
			? db.select().from(schema.repairParts).where(inArray(schema.repairParts.repairId, repairIds))
			: Promise.resolve([]),
		repairIds.length > 0
			? db.select().from(schema.photos).where(inArray(schema.photos.repairId, repairIds))
			: Promise.resolve([]),
		listPaymentsByRepairIds(repairIds),
		shopIds.length > 0
			? db.select().from(schema.shops).where(inArray(schema.shops.id, shopIds))
			: Promise.resolve([]),
		carIds.length > 0
			? db.select().from(schema.cars).where(inArray(schema.cars.id, carIds))
			: Promise.resolve([]),
		Promise.all(mechanicIds.map((id) => getMechanic(id)))
	]);

	const partsByRepairId = new Map<string, (typeof schema.repairParts.$inferSelect)[]>();
	for (const part of parts) {
		const current = partsByRepairId.get(part.repairId) ?? [];
		partsByRepairId.set(part.repairId, [...current, part]);
	}

	const photosByRepairId = new Map<string, (typeof schema.photos.$inferSelect)[]>();
	for (const photo of photos) {
		const current = photosByRepairId.get(photo.repairId) ?? [];
		photosByRepairId.set(photo.repairId, [...current, photo]);
	}

	const paymentsByRepairId = new Map<string, (typeof schema.payments.$inferSelect)[]>();
	for (const payment of payments) {
		const current = paymentsByRepairId.get(payment.repairId) ?? [];
		paymentsByRepairId.set(payment.repairId, [...current, payment]);
	}

	const shopById = new Map(shops.map((shop) => [shop.id, shop]));
	const carById = new Map(cars.map((car) => [car.id, car]));
	const mechanicById = new Map(
		mechanics.filter((m): m is NonNullable<typeof m> => Boolean(m)).map((m) => [m.id, m])
	);

	const repairsWithParts = repairs.map((repair) => ({
		...repair,
		parts: partsByRepairId.get(repair.id) ?? [],
		payments: paymentsByRepairId.get(repair.id) ?? [],
		photos: formatPhotosForResponse(photosByRepairId.get(repair.id) ?? []),
		shop: repair.shopId ? (shopById.get(repair.shopId) ?? null) : null,
		car: carById.get(repair.carId) ?? null,
		assignedMechanic: repair.assignedMechanicId
			? (mechanicById.get(repair.assignedMechanicId) ?? null)
			: null
	}));

	logger.debug('Repairs fetched', { count: repairsWithParts.length, userId: user.id });

	return json(successResponse(repairsWithParts));
};

// POST /api/repairs - Create a new repair
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals);

	// Validate request body
	const validatedData = await validateBody(request, repairSchema);

	// Determine if this is a shop creating a repair for a customer or a customer creating their own
	const isShopUser = isShopMember(user);
	let carOwnerId: string;

	if (isShopUser) {
		// Shop owners/mechanics can create repairs for any car
		// They must provide a shopId
		if (!validatedData.shopId) {
			throw error(400, 'Shop ID is required when creating repairs as a shop');
		}

		// Verify shop access
		await verifyShopAccess(validatedData.shopId, user.id, user.role || 'customer');

		// Get car to find the owner
		const car = await fetchById(schema.cars, validatedData.carId);
		if (!car) throw error(404, 'Car not found');

		carOwnerId = car.userId;

		logger.info('Shop creating repair for customer', {
			userId: user.id,
			shopId: validatedData.shopId,
			carId: validatedData.carId,
			customerId: carOwnerId
		});
	} else {
		// Customers can only create repairs for their own cars
		await verifyOwnership(schema.cars, validatedData.carId, user.id, 'Car');
		carOwnerId = user.id;

		logger.info('Customer creating own repair', { userId: user.id, carId: validatedData.carId });
	}

	// Use transaction to ensure atomicity
	const result = transaction((tx) => {
		const repairId = generateId();
		const parts = isShopUser ? validatedData.parts : [];
		const status = isShopUser ? validatedData.status : REPAIR_STATUS.PENDING;
		const shopId = isShopUser ? validatedData.shopId || null : null;
		const assignedMechanicId = isShopUser ? validatedData.assignedMechanicId || null : null;
		const estimatedCost = isShopUser ? validatedData.estimatedCost : 0;
		const estimatedHours = isShopUser ? validatedData.estimatedHours : 0;
		const estimateNotes = isShopUser ? validatedData.estimateNotes || null : null;
		const laborCost = isShopUser ? validatedData.laborCost : 0;
		const laborHours = isShopUser ? validatedData.laborHours : 0;
		const totalCost = isShopUser ? validatedData.totalCost : 0;
		const appointmentAt =
			isShopUser && validatedData.appointmentAt ? new Date(validatedData.appointmentAt) : null;
		const startDate =
			isShopUser && validatedData.startDate ? new Date(validatedData.startDate) : null;
		const completedDate =
			isShopUser && validatedData.completedDate ? new Date(validatedData.completedDate) : null;

		const newRepair = {
			id: repairId,
			carId: validatedData.carId,
			userId: carOwnerId, // Car owner, not necessarily the creator
			shopId,
			assignedMechanicId,
			title: validatedData.title,
			description: validatedData.description || null,
			status,
			// Estimate fields
			estimatedCost,
			estimatedHours,
			estimateNotes,
			// Actual fields
			laborCost,
			laborHours,
			totalCost,
			// Approval and payment
			customerApproved: false,
			approvedAt: null,
			paymentStatus: PAYMENT_STATUS.UNPAID,
			amountPaid: 0,
			// Dates
			appointmentAt,
			startDate,
			completedDate,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		tx.insert(schema.repairs).values(newRepair).run();

		// Add parts if provided
		const insertedParts = [];
		if (parts.length > 0) {
			for (const part of parts) {
				const partData = {
					id: generateId(),
					repairId,
					name: part.name,
					description: part.description || null,
					quantity: part.quantity,
					unitCost: part.unitCost,
					totalCost: part.totalCost,
					sourceUrl: part.sourceUrl || null,
					createdAt: new Date()
				};

				tx.insert(schema.repairParts).values(partData).run();
				insertedParts.push(partData);
			}
		}

		return { ...newRepair, parts: insertedParts };
	});

	logger.info('Repair created', { repairId: result.id, userId: user.id, shopId: result.shopId });

	return json(successResponse(result, 201), { status: 201 });
};
