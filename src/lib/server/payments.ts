import { and, asc, eq, exists, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { writeBatch } from './api-utils';

type PaymentRepairSnapshot = Pick<
	typeof schema.repairs.$inferSelect,
	'id' | 'userId' | 'shopId' | 'amountPaid' | 'totalCost' | 'status'
>;

type PaymentRepairUpdate = Pick<
	typeof schema.repairs.$inferInsert,
	'amountPaid' | 'paymentStatus' | 'status' | 'updatedAt'
>;

/** Inserts a payment and updates repair totals only while the authorized snapshot is current. */
export async function recordPaymentIfUnchanged(
	repair: PaymentRepairSnapshot,
	payment: typeof schema.payments.$inferInsert,
	updatedRepair: PaymentRepairUpdate
): Promise<typeof schema.payments.$inferSelect | null> {
	const insert = db.insert(schema.payments).select(
		db
			.select({
				id: sql`${payment.id}`.as('id'),
				repairId: schema.repairs.id,
				amount: sql`${payment.amount}`.as('amount'),
				method: sql`${payment.method}`.as('method'),
				notes: sql`${payment.notes ?? null}`.as('notes'),
				recordedBy: sql`${payment.recordedBy}`.as('recordedBy'),
				paidAt: sql`${schema.payments.paidAt.mapToDriverValue(payment.paidAt)}`.as('paidAt'),
				createdAt:
					sql`${schema.payments.createdAt.mapToDriverValue(payment.createdAt ?? payment.paidAt)}`.as(
						'createdAt'
					)
			})
			.from(schema.repairs)
			.where(
				and(
					eq(schema.repairs.id, repair.id),
					eq(schema.repairs.userId, repair.userId),
					repair.shopId === null
						? isNull(schema.repairs.shopId)
						: eq(schema.repairs.shopId, repair.shopId),
					repair.amountPaid === null
						? isNull(schema.repairs.amountPaid)
						: eq(schema.repairs.amountPaid, repair.amountPaid),
					repair.totalCost === null
						? isNull(schema.repairs.totalCost)
						: eq(schema.repairs.totalCost, repair.totalCost),
					eq(schema.repairs.status, repair.status)
				)
			)
	);
	const update = db
		.update(schema.repairs)
		.set(updatedRepair)
		.where(
			and(
				eq(schema.repairs.id, repair.id),
				exists(
					db
						.select({ id: schema.payments.id })
						.from(schema.payments)
						.where(and(eq(schema.payments.id, payment.id), eq(schema.payments.repairId, repair.id)))
				)
			)
		);

	await writeBatch([insert, update]);

	const [recorded] = await db
		.select()
		.from(schema.payments)
		.where(eq(schema.payments.id, payment.id))
		.limit(1);

	return recorded ?? null;
}

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
