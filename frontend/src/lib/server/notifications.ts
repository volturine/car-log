import { db, schema } from './db';
import { generateId } from '$lib/utils/helpers';
import { apiLogger } from './logger';

const logger = apiLogger.child('notifications');

export type NotificationType =
	| 'estimate_ready'
	| 'estimate_approved'
	| 'estimate_rejected'
	| 'repair_started'
	| 'repair_completed'
	| 'payment_received';

export interface CreateNotificationParams {
	userId: string;
	type: NotificationType;
	title: string;
	message: string;
	relatedId?: string;
	relatedType?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
	const notification = {
		id: generateId(),
		userId: params.userId,
		type: params.type,
		title: params.title,
		message: params.message,
		relatedId: params.relatedId || null,
		relatedType: params.relatedType || null,
		read: false,
		readAt: null,
		createdAt: new Date()
	};

	await db.insert(schema.notifications).values(notification);

	logger.info('Notification created', {
		notificationId: notification.id,
		userId: params.userId,
		type: params.type
	});

	return notification;
}

/**
 * Create notification when estimate is ready
 */
export async function notifyEstimateReady(userId: string, repairId: string, shopName: string) {
	return createNotification({
		userId,
		type: 'estimate_ready',
		title: 'Estimate Ready',
		message: `${shopName} has prepared an estimate for your repair. Please review and approve.`,
		relatedId: repairId,
		relatedType: 'repair'
	});
}

/**
 * Create notification when estimate is approved
 */
export async function notifyEstimateApproved(shopOwnerId: string, repairId: string, customerName: string) {
	return createNotification({
		userId: shopOwnerId,
		type: 'estimate_approved',
		title: 'Estimate Approved',
		message: `${customerName} has approved the estimate. You can begin the repair.`,
		relatedId: repairId,
		relatedType: 'repair'
	});
}

/**
 * Create notification when estimate is rejected
 */
export async function notifyEstimateRejected(shopOwnerId: string, repairId: string, customerName: string) {
	return createNotification({
		userId: shopOwnerId,
		type: 'estimate_rejected',
		title: 'Estimate Rejected',
		message: `${customerName} has rejected the estimate.`,
		relatedId: repairId,
		relatedType: 'repair'
	});
}

/**
 * Create notification when repair is started
 */
export async function notifyRepairStarted(userId: string, repairId: string, shopName: string) {
	return createNotification({
		userId,
		type: 'repair_started',
		title: 'Repair Started',
		message: `${shopName} has started working on your repair.`,
		relatedId: repairId,
		relatedType: 'repair'
	});
}

/**
 * Create notification when repair is completed
 */
export async function notifyRepairCompleted(userId: string, repairId: string, shopName: string, totalCost: number) {
	return createNotification({
		userId,
		type: 'repair_completed',
		title: 'Repair Completed',
		message: `${shopName} has completed your repair. Total cost: $${totalCost.toFixed(2)}`,
		relatedId: repairId,
		relatedType: 'repair'
	});
}

/**
 * Create notification when payment is received
 */
export async function notifyPaymentReceived(shopOwnerId: string, repairId: string, amount: number, customerName: string) {
	return createNotification({
		userId: shopOwnerId,
		type: 'payment_received',
		title: 'Payment Received',
		message: `Received $${amount.toFixed(2)} from ${customerName}`,
		relatedId: repairId,
		relatedType: 'repair'
	});
}
