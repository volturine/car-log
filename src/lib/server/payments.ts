import { asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';

export async function listPayments(
	repairId: string
): Promise<Array<typeof schema.payments.$inferSelect>> {
	return db
		.select()
		.from(schema.payments)
		.where(eq(schema.payments.repairId, repairId))
		.orderBy(asc(schema.payments.paidAt), asc(schema.payments.createdAt));
}

export async function listPaymentsByRepairIds(
	repairIds: string[]
): Promise<Array<typeof schema.payments.$inferSelect>> {
	if (repairIds.length === 0) {
		return [];
	}

	return db
		.select()
		.from(schema.payments)
		.where(inArray(schema.payments.repairId, repairIds))
		.orderBy(
			asc(schema.payments.repairId),
			asc(schema.payments.paidAt),
			asc(schema.payments.createdAt)
		);
}
