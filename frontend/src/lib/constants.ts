/**
 * Application-wide constants
 * Centralizes magic strings and numbers for maintainability
 */

// Repair Status Constants
export const REPAIR_STATUS = {
	PENDING: 'pending',
	IN_PROGRESS: 'in-progress',
	COMPLETED: 'completed'
} as const;

export type RepairStatus = (typeof REPAIR_STATUS)[keyof typeof REPAIR_STATUS];

// UI Constants for Repair Status
export const STATUS_COLORS: Record<RepairStatus, string> = {
	[REPAIR_STATUS.PENDING]: 'secondary',
	[REPAIR_STATUS.IN_PROGRESS]: 'default',
	[REPAIR_STATUS.COMPLETED]: 'outline'
};

export const STATUS_LABELS: Record<RepairStatus, string> = {
	[REPAIR_STATUS.PENDING]: 'Pending',
	[REPAIR_STATUS.IN_PROGRESS]: 'In Progress',
	[REPAIR_STATUS.COMPLETED]: 'Completed'
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
