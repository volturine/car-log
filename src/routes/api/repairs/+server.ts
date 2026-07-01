import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { and, eq, inArray, like, or, count, desc } from 'drizzle-orm';
import { requireAuth } from '$lib/server/api-utils';
import { repairSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils';
const logger = apiLogger.child('repairs');

const parseQuery = (
	url: URL
): { status?: string; search?: string; page: number; limit: number } => {
	const status = url.searchParams.get('status') || undefined;
	const search = url.searchParams.get('search') || undefined;
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '10', 10);
	return { status, search, page: isNaN(page) ? 1 : page, limit: isNaN(limit) ? 10 : limit };
};

// GET /api/repairs - List repairs for current user
export const GET: RequestHandler = async ({ locals, url }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;
	const { status, search, page, limit } = parseQuery(url);
	const offset = (page - 1) * limit;

	logger.debug('Fetching repairs', { userId: user.id, status, page });

	const conditions = and(
		...[
			// Always fetch only the current user's repairs
			eq(schema.repairs.userId, user.id)
		],
		status ? eq(schema.repairs.status, status) : undefined,
		search
			? or(
					like(schema.repairs.title, `%${search}%`),
					like(schema.repairs.description, `%${search}%`)
				)
			: undefined
	);

	const [totalResult] = await db.select({ total: count() }).from(schema.repairs).where(conditions);
	const total = totalResult.total;

	const repairs = await db
		.select()
		.from(schema.repairs)
		.where(conditions)
		.orderBy(desc(schema.repairs.updatedAt))
		.limit(limit)
		.offset(offset);

	const repairIds = repairs.map((r) => r.id);
	const partsByRepair = new Map<string, (typeof schema.repairParts.$inferSelect)[]>();

	if (repairIds.length > 0) {
		const allParts = await db
			.select()
			.from(schema.repairParts)
			.where(inArray(schema.repairParts.repairId, repairIds));
		for (const part of allParts) {
			if (!partsByRepair.has(part.repairId)) {
				partsByRepair.set(part.repairId, []);
			}
			partsByRepair.get(part.repairId)!.push(part);
		}
	}

	const formattedRepairs = repairs.map((r) => ({
		...r,
		parts: partsByRepair.get(r.id) || []
	}));

	logger.debug('Repairs fetched', { count: formattedRepairs.length, userId: user.id, page });

	return json({ success: true, data: { repairs: formattedRepairs, total, page } });
};

// POST /api/repairs - Create a new repair
export const POST: RequestHandler = async ({ request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;
	const body = await request.json();
	const validated = repairSchema.parse(body);

	logger.info('Creating repair', { userId: user.id, carId: validated.carId });

	const repair = {
		id: generateId(),
		userId: user.id,
		carId: validated.carId,
		title: validated.title,
		description: validated.description,
		createdAt: new Date(),
		updatedAt: new Date(),
		status: 'draft'
	} satisfies typeof schema.repairs.$inferInsert;

	const result = await db.insert(schema.repairs).values(repair).returning();

	logger.info('Repair created', { repairId: result[0].id, userId: user.id });

	return json({ success: true, data: result[0] }, { status: 201 });
};
