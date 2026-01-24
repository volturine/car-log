import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { carSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils/helpers';
import {
	apiOk,
	unauthorizedError,
	validationError,
	toJsonResponse,
	type ApiResult
} from '$lib/server/result';
import { ResultAsync, errAsync } from 'neverthrow';
import { z } from 'zod';

const logger = apiLogger.child('cars');

type User = { id: string; name?: string | null; email: string };

// Helper: Authenticate user with Result
function authenticateUser(locals: App.Locals): ApiResult<User> {
	if (!locals.user) {
		return unauthorizedError();
	}
	return apiOk(locals.user);
}

// Helper: Validate request body with Result
async function validateCarData(request: Request): Promise<ApiResult<z.infer<typeof carSchema>>> {
	try {
		const data = await request.json();
		const validated = carSchema.parse(data);
		return apiOk(validated);
	} catch (err) {
		if (err instanceof z.ZodError) {
			const message = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			return validationError(message);
		}
		return validationError('Invalid request body');
	}
}

// Helper: Fetch user cars with Result
async function fetchUserCars(userId: string): Promise<ApiResult<typeof schema.cars.$inferSelect[]>> {
	try {
		logger.info('Fetching cars', { userId });

		const cars = await db.select().from(schema.cars).where(eq(schema.cars.userId, userId));

		logger.debug('Cars fetched', { count: cars.length, userId });

		return apiOk(cars);
	} catch (err) {
		logger.error('Failed to fetch cars', err as Error, { userId });
		return errAsync(new Error('Failed to fetch cars')).mapErr(() => ({
			type: 'internal' as const,
			message: 'Failed to fetch cars',
			status: 500 as const
		}));
	}
}

// Helper: Create car with Result
async function createCar(
	userId: string,
	carData: z.infer<typeof carSchema>
): Promise<ApiResult<typeof schema.cars.$inferSelect>> {
	try {
		logger.info('Creating car', { userId, brand: carData.brand });

		const newCar = {
			id: generateId(),
			userId,
			...carData,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		await db.insert(schema.cars).values(newCar);

		logger.info('Car created', { carId: newCar.id, userId });

		return apiOk(newCar, 201);
	} catch (err) {
		logger.error('Failed to create car', err as Error, { userId });
		return errAsync(new Error('Failed to create car')).mapErr(() => ({
			type: 'internal' as const,
			message: 'Failed to create car',
			status: 500 as const
		}));
	}
}

// GET /api/cars - List all cars for the authenticated user
export const GET: RequestHandler = async ({ locals }) => {
	const userResult = authenticateUser(locals);

	if (userResult.isErr()) {
		return toJsonResponse(userResult);
	}

	const user = userResult.value.data;
	const carsResult = await fetchUserCars(user.id);

	return toJsonResponse(carsResult);
};

// POST /api/cars - Create a new car
export const POST: RequestHandler = async ({ request, locals }) => {
	const userResult = authenticateUser(locals);

	if (userResult.isErr()) {
		return toJsonResponse(userResult);
	}

	const user = userResult.value.data;

	const validationResult = await validateCarData(request);

	if (validationResult.isErr()) {
		return toJsonResponse(validationResult);
	}

	const carData = validationResult.value.data;
	const createResult = await createCar(user.id, carData);

	return toJsonResponse(createResult);
};
