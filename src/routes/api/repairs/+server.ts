import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and, sql } from 'drizzle-orm';
import {
	requireAuth,
	verifyOwnership,
	validateBody,
	successResponse,
	transaction,
	fetchById,
	formatPhotosForResponse,
	isShopMember,
	verifyShopAccess
} from '$lib/server/api-utils';
import { repairSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { PAYMENT_STATUS, REPAIR_STATUS } from '$lib/constants';
import { listPayments } from '$lib/server/payments';
import { generateId } from '$lib/utils';
import { error } from '@sveltejs/kit';

const logger = apiLogger.child('repairs');

type Mechanic = {
	id: string;
	name: string | null;
	email: string;
};

async function getMechanic(id: string | null): Promise<Mechanic | null> {
	if (!id) {
		return null;
	}

	const [user] = await db
		.select({
			id: schema.users.id,
			name: schema.users.name,
			email: schema.users.email
		})
		.from(schema.users)
		.where(eq(schema.users.id, id))
		.limit(1);

	if (!user) {
		return null;
	}

	return user;
}

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

	// Get repair parts and photos for each repair
	const repairsWithParts = await Promise.all(
		repairs.map(async (repair) => {
			const parts = await db
				.select()
				.from(schema.repairParts)
				.where(eq(schema.repairParts.repairId, repair.id));

			const photos = await db
				.select()
				.from(schema.photos)
				.where(eq(schema.photos.repairId, repair.id));

			const payments = await listPayments(repair.id);

			// Get shop info if shopId exists
			let shopInfo = null;
			if (repair.shopId) {
				const [shop] = await db
					.select()
					.from(schema.shops)
					.where(eq(schema.shops.id, repair.shopId))
					.limit(1);
				shopInfo = shop || null;
			}

			// Get car info
			const [car] = await db
				.select()
				.from(schema.cars)
				.where(eq(schema.cars.id, repair.carId))
				.limit(1);

			const assignedMechanic = await getMechanic(repair.assignedMechanicId);

			return {
				...repair,
				parts,
				payments,
				photos: formatPhotosForResponse(photos),
				shop: shopInfo,
				car: car || null,
				assignedMechanic
			};
		})
	);

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
