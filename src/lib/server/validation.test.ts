import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('zod', () => {
	const chain = {
		min: vi.fn(() => chain),
		max: vi.fn(() => chain),
		int: vi.fn(() => chain),
		email: vi.fn(() => chain),
		uuid: vi.fn(() => chain),
		enum: vi.fn(() => chain),
		default: vi.fn(() => chain),
		optional: vi.fn(() => chain),
		nullable: vi.fn(() => chain),
		array: vi.fn(() => chain),
		url: vi.fn(() => chain),
		datetime: vi.fn(() => chain)
	};

	return {
		z: {
			object: vi.fn(() => chain),
			string: vi.fn(() => chain),
			number: vi.fn(() => chain),
			array: vi.fn(() => chain),
			enum: vi.fn(() => chain)
		}
	};
});

vi.mock('$lib/constants', () => ({
	REPAIR_STATUS_VALUES: [
		'estimate_pending',
		'estimate_approved',
		'estimate_rejected',
		'in_progress',
		'completed',
		'paid',
		'pending'
	],
	VALIDATION_LIMITS: {
		CAR: {
			BRAND_MAX_LENGTH: 100,
			MODEL_MAX_LENGTH: 100,
			YEAR_MIN: 1900,
			YEAR_MAX: 2100,
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
		}
	}
}));

describe('validateEnv', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.unstubAllEnvs();
	});

	it('warns when a Google OAuth env var is missing its pair', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		vi.stubEnv('BETTER_AUTH_SECRET', '12345678901234567890123456789012');
		vi.stubEnv('BETTER_AUTH_URL', 'https://car-log.test');
		vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');

		const { validateEnv } = await import('./validation');

		validateEnv();

		expect(warn).toHaveBeenCalledWith(
			'Warning: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set to enable Google authentication.'
		);
	});

	it('does not warn about Google OAuth when both env vars are present', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		vi.stubEnv('BETTER_AUTH_SECRET', '12345678901234567890123456789012');
		vi.stubEnv('BETTER_AUTH_URL', 'https://car-log.test');
		vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');
		vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');

		const { validateEnv } = await import('./validation');

		validateEnv();

		expect(warn).not.toHaveBeenCalledWith(
			'Warning: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set to enable Google authentication.'
		);
	});

	it('throws when BETTER_AUTH_SECRET is missing in production', async () => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('BETTER_AUTH_SECRET', '');
		vi.stubEnv('BETTER_AUTH_URL', 'https://car-log.test');

		const { validateEnv } = await import('./validation');

		expect(() => validateEnv()).toThrow('BETTER_AUTH_SECRET is required in production.');
	});

	it('throws when BETTER_AUTH_URL is not https in production', async () => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('BETTER_AUTH_SECRET', '12345678901234567890123456789012');
		vi.stubEnv('BETTER_AUTH_URL', 'http://car-log.test');

		const { validateEnv } = await import('./validation');

		expect(() => validateEnv()).toThrow('BETTER_AUTH_URL must use https in production.');
	});
});
