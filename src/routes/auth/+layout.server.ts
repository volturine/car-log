import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { googleEnabled } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, resolve('/app'));
	}

	return { googleEnabled };
};
