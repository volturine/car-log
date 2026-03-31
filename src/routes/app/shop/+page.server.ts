import { resolve } from '$app/paths';
import { USER_ROLE } from '$lib/constants';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return {};
	}

	if (user.role !== USER_ROLE.SHOP_OWNER && user.role !== USER_ROLE.MECHANIC) {
		throw redirect(302, resolve('/app/cars'));
	}

	return {};
};
