import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { getFilePath, cleanupPhotoFiles } from '$lib/server/storage';
import { requireAuth, verifyPhotoAccess } from '$lib/server/api-utils';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { fileLogger } from '$lib/server/logger';
import { toError } from '$lib/utils';

const logger = fileLogger.child('photos');

export const GET: RequestHandler = async ({ params, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const photoResult = await verifyPhotoAccess(params.id, user);
	if (photoResult.isErr()) {
		return json(
			{ success: false, error: photoResult.error.message },
			{ status: photoResult.error.status }
		);
	}

	const photo = photoResult.value;

	logger.debug('Serving photo', { photoId: params.id, userId: user.id });

	try {
		const filePath = getFilePath(photo.path);
		const fileBuffer = await readFile(filePath);

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': photo.mimeType,
				'Content-Length': photo.size.toString(),
				'Cache-Control': 'public, max-age=31536000',
				ETag: `"${photo.id}"`
			}
		});
	} catch (err) {
		logger.error('Failed to read photo file', toError(err), { photoId: params.id });
		throw error(500, 'Failed to load photo');
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const photoResult = await verifyPhotoAccess(params.id, user);
	if (photoResult.isErr()) {
		return json(
			{ success: false, error: photoResult.error.message },
			{ status: photoResult.error.status }
		);
	}

	const photo = photoResult.value;

	logger.info('Deleting photo', { photoId: params.id, userId: user.id });

	await db.delete(schema.photos).where(eq(schema.photos.id, params.id));
	await cleanupPhotoFiles([photo]);
	logger.info('Photo file deleted', { photoId: params.id, path: photo.path });

	return json({ success: true, data: { deleted: true } });
};
