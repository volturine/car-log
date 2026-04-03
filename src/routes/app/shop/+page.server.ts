import { resolve } from '$app/paths';
import { USER_ROLE } from '$lib/constants';
import { findUserShop } from '$lib/server/api-utils';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return { shop: null, isOwner: false };
	}

	if (user.role !== USER_ROLE.SHOP_OWNER && user.role !== USER_ROLE.MECHANIC) {
		throw redirect(302, resolve('/app/cars'));
	}

	const shop = await findUserShop(user);

	if (!shop) {
		throw redirect(302, resolve('/app/shop/setup'));
	}

	return {
		shop,
		isOwner: shop.ownerId === user.id,
		isMechanic: user.role === USER_ROLE.MECHANIC,
		userId: user.id
	};
};
