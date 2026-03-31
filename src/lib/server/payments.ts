import { asc, eq } from 'drizzle-orm';
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
