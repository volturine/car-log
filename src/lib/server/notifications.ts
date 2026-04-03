import { db, schema } from './db';
import { generateId } from '$lib/utils';
import { apiLogger } from './logger';

const logger = apiLogger.child('notifications');

export type NotificationType =
	| 'estimate_ready'
	| 'estimate_approved'
	| 'estimate_rejected'
	| 'repair_started'
	| 'repair_completed'
	| 'payment_received';

type NotificationData = {
	amount?: number;
	customerName?: string;
	shopName?: string;
	totalCost?: number;
};

// Notification templates
const TEMPLATES: Record<
	NotificationType,
	{ title: string; message: (data: NotificationData) => string }
> = {
	estimate_ready: {
		title: 'Estimate Ready',
		message: (d) =>
			`${d.shopName} has prepared an estimate for your repair. Please review and approve.`
	},
	estimate_approved: {
		title: 'Estimate Approved',
		message: (d) => `${d.customerName} has approved the estimate. You can begin the repair.`
	},
	estimate_rejected: {
		title: 'Estimate Rejected',
		message: (d) => `${d.customerName} has rejected the estimate.`
	},
	repair_started: {
		title: 'Repair Started',
		message: (d) => `${d.shopName} has started working on your repair.`
	},
	repair_completed: {
		title: 'Repair Completed',
		message: (d) =>
			`${d.shopName} has completed your repair. Total cost: $${d.totalCost?.toFixed(2) || '0.00'}`
	},
	payment_received: {
		title: 'Payment Received',
		message: (d) => `Received $${d.amount?.toFixed(2) || '0.00'} from ${d.customerName}`
	}
};

/**
 * Generic notification creator
 */
export async function notify(
	type: NotificationType,
	userId: string,
	repairId: string,
	data: NotificationData = {}
) {
	const template = TEMPLATES[type];
	const notification = {
		id: generateId(),
		userId,
		type,
		title: template.title,
		message: template.message(data),
		relatedId: repairId,
		relatedType: 'repair',
		read: false,
		readAt: null,
		createdAt: new Date()
	};

	await db.insert(schema.notifications).values(notification);
	logger.info('Notification created', { notificationId: notification.id, userId, type });
	return notification;
}

// Convenience exports for backward compatibility
export const notifyEstimateReady = (userId: string, repairId: string, shopName: string) =>
	notify('estimate_ready', userId, repairId, { shopName });

export const notifyEstimateApproved = (
	shopOwnerId: string,
	repairId: string,
	customerName: string
) => notify('estimate_approved', shopOwnerId, repairId, { customerName });

export const notifyEstimateRejected = (
	shopOwnerId: string,
	repairId: string,
	customerName: string
) => notify('estimate_rejected', shopOwnerId, repairId, { customerName });

export const notifyRepairStarted = (userId: string, repairId: string, shopName: string) =>
	notify('repair_started', userId, repairId, { shopName });

export const notifyRepairCompleted = (
	userId: string,
	repairId: string,
	shopName: string,
	totalCost: number
) => notify('repair_completed', userId, repairId, { shopName, totalCost });

export const notifyPaymentReceived = (
	shopOwnerId: string,
	repairId: string,
	amount: number,
	customerName: string
) => notify('payment_received', shopOwnerId, repairId, { amount, customerName });
