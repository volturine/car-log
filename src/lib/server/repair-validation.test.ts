import { describe, expect, it } from 'vitest';
import { repairSchema } from './validation';

describe('repair mechanic identifiers', () => {
	it('accepts actual better-auth user IDs and legacy UUIDs', () => {
		const schema = repairSchema.partial();
		for (const id of ['BJqazJf6MjruKzGlFBiOhACrXH5AYNVt', '66666666-7777-4888-9999-aaaaaaaaaaaa']) {
			expect(schema.safeParse({ assignedMechanicId: id }).success).toBe(true);
		}
	});

	it('allows unassigning a mechanic and rejects empty or oversized identifiers', () => {
		const schema = repairSchema.partial();
		expect(schema.safeParse({ assignedMechanicId: null }).success).toBe(true);
		expect(schema.safeParse({ assignedMechanicId: '' }).success).toBe(false);
		expect(schema.safeParse({ assignedMechanicId: 'a'.repeat(65) }).success).toBe(false);
	});
});
