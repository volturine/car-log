/**
 * Application-wide constants
 * Centralizes magic strings and numbers for maintainability
 */

// User Role Constants
export const USER_ROLE = {
	CUSTOMER: 'customer',
	SHOP_OWNER: 'shop_owner',
	MECHANIC: 'mechanic',
	ADMIN: 'admin'
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// Repair Status Constants
export const REPAIR_STATUS = {
	ESTIMATE_PENDING: 'estimate_pending',
	ESTIMATE_APPROVED: 'estimate_approved',
	ESTIMATE_REJECTED: 'estimate_rejected',
	IN_PROGRESS: 'in_progress',
	COMPLETED: 'completed',
	PAID: 'paid',
	// Legacy statuses (for backwards compatibility)
	PENDING: 'pending'
} as const;

export type RepairStatus = (typeof REPAIR_STATUS)[keyof typeof REPAIR_STATUS];

export const REPAIR_STATUS_VALUES = [
	REPAIR_STATUS.ESTIMATE_PENDING,
	REPAIR_STATUS.ESTIMATE_APPROVED,
	REPAIR_STATUS.ESTIMATE_REJECTED,
	REPAIR_STATUS.IN_PROGRESS,
	REPAIR_STATUS.COMPLETED,
	REPAIR_STATUS.PAID,
	REPAIR_STATUS.PENDING
] as const;

// UI Constants for Repair Status
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export const STATUS_COLORS = {
	[REPAIR_STATUS.ESTIMATE_PENDING]: 'secondary',
	[REPAIR_STATUS.ESTIMATE_APPROVED]: 'default',
	[REPAIR_STATUS.ESTIMATE_REJECTED]: 'destructive',
	[REPAIR_STATUS.IN_PROGRESS]: 'default',
	[REPAIR_STATUS.COMPLETED]: 'outline',
	[REPAIR_STATUS.PAID]: 'outline',
	[REPAIR_STATUS.PENDING]: 'secondary'
} as const satisfies Record<RepairStatus, BadgeVariant>;

export const STATUS_LABELS: Record<RepairStatus, string> = {
	[REPAIR_STATUS.ESTIMATE_PENDING]: 'Estimate Pending',
	[REPAIR_STATUS.ESTIMATE_APPROVED]: 'Estimate Approved',
	[REPAIR_STATUS.ESTIMATE_REJECTED]: 'Estimate Rejected',
	[REPAIR_STATUS.IN_PROGRESS]: 'In Progress',
	[REPAIR_STATUS.COMPLETED]: 'Completed',
	[REPAIR_STATUS.PAID]: 'Paid',
	[REPAIR_STATUS.PENDING]: 'Pending'
};

// Payment Status Constants
export const PAYMENT_STATUS = {
	UNPAID: 'unpaid',
	PARTIAL: 'partial',
	PAID: 'paid'
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_METHOD = {
	CASH: 'cash',
	CARD: 'card',
	CHECK: 'check',
	TRANSFER: 'transfer',
	OTHER: 'other'
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_METHOD_VALUES = [
	PAYMENT_METHOD.CASH,
	PAYMENT_METHOD.CARD,
	PAYMENT_METHOD.CHECK,
	PAYMENT_METHOD.TRANSFER,
	PAYMENT_METHOD.OTHER
] as const;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
	[PAYMENT_METHOD.CASH]: 'Cash',
	[PAYMENT_METHOD.CARD]: 'Credit/Debit Card',
	[PAYMENT_METHOD.CHECK]: 'Check',
	[PAYMENT_METHOD.TRANSFER]: 'Bank Transfer',
	[PAYMENT_METHOD.OTHER]: 'Other'
};

// Rate Limiting Constants
export const RATE_LIMITS = {
	REQUESTS_PER_MINUTE: 100,
	WINDOW_MS: 60000 // 1 minute
} as const;

// Session Constants
export const SESSION_CONFIG = {
	EXPIRY_SECONDS: 60 * 60 * 24 * 7, // 7 days
	UPDATE_AGE_SECONDS: 60 * 60 * 24, // 1 day
	COOKIE_CACHE_SECONDS: 5 * 60 // 5 minutes
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
	MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
	MAX_FILES_PER_REQUEST: 20,
	ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
	MAX_EXTENSION_LENGTH: 10
} as const;

// Validation Constants
export const VALIDATION_LIMITS = {
	CAR: {
		BRAND_MAX_LENGTH: 100,
		MODEL_MAX_LENGTH: 100,
		YEAR_MIN: 1900,
		YEAR_MAX: new Date().getFullYear() + 2,
		VIN_MAX_LENGTH: 17,
		LICENSE_PLATE_MAX_LENGTH: 20,
		OWNER_NAME_MAX_LENGTH: 200,
		OWNER_PHONE_MAX_LENGTH: 20,
		COLOR_MAX_LENGTH: 50
	},
	SHOP: {
		NAME_MAX_LENGTH: 200,
		EMAIL_MAX_LENGTH: 320,
		PHONE_MAX_LENGTH: 20,
		ADDRESS_MAX_LENGTH: 500,
		CITY_MAX_LENGTH: 100,
		STATE_MAX_LENGTH: 50,
		ZIP_CODE_MAX_LENGTH: 10,
		BUSINESS_HOURS_MAX_LENGTH: 5000,
		SPECIALTY_MAX_LENGTH: 100,
		MAX_SPECIALTIES: 25
	},
	REPAIR: {
		TITLE_MAX_LENGTH: 200,
		DESCRIPTION_MAX_LENGTH: 5000,
		MAX_COST: 1000000,
		MAX_HOURS: 10000
	},
	PART: {
		NAME_MAX_LENGTH: 200,
		DESCRIPTION_MAX_LENGTH: 1000,
		MAX_QUANTITY: 10000,
		SOURCE_URL_MAX_LENGTH: 500
	},
	PAYMENT: {
		NOTES_MAX_LENGTH: 2000
	}
} as const;

// Date Format Constants
export const DATE_FORMATS = {
	DISPLAY: {
		year: 'numeric' as const,
		month: 'short' as const,
		day: 'numeric' as const
	},
	ISO: 'YYYY-MM-DD'
} as const;

// Pagination Constants
export const PAGINATION = {
	DEFAULT_LIMIT: 50,
	MAX_LIMIT: 200
} as const;

// API Response Constants
export const API_ERRORS = {
	UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401, message: 'Authentication required' },
	FORBIDDEN: { code: 'FORBIDDEN', status: 403, message: 'Access denied' },
	NOT_FOUND: { code: 'NOT_FOUND', status: 404, message: 'Resource not found' },
	VALIDATION_ERROR: {
		code: 'VALIDATION_ERROR',
		status: 400,
		message: 'Validation failed'
	},
	RATE_LIMITED: {
		code: 'RATE_LIMITED',
		status: 429,
		message: 'Too many requests'
	},
	SERVER_ERROR: {
		code: 'SERVER_ERROR',
		status: 500,
		message: 'Internal server error'
	}
} as const;
