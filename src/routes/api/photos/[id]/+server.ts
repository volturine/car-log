import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { deleteFile, readFile } from '$lib/server/storage';
import { requireAuth, verifyPhotoAccess, successResponse } from '$lib/server/api-utils';
import { eq } from 'drizzle-orm';
import { fileLogger } from '$lib/server/logger';
import { toError } from '$lib/utils';

const logger = fileLogger.child('photos');

// GET /api/photos/[id] - Get a photo
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	const photo = await verifyPhotoAccess(params.id, user);

	logger.debug('Serving photo', { photoId: params.id, userId: user.id });

	let bytes: Uint8Array<ArrayBuffer> | null;
	try {
		bytes = await readFile(photo.path);
	} catch (err) {
		logger.error('Failed to read photo file', toError(err), { photoId: params.id });
		throw error(500, 'Failed to load photo');
	}

	if (!bytes) {
		logger.error('Photo file is missing', undefined, { photoId: params.id });
		throw error(404, 'Photo not found');
	}

	// Reauthorize every read after logout or shop membership changes; neither
	// browsers nor shared caches may reuse previously authorized photo bytes.
	return new Response(bytes, {
		headers: {
			'Content-Type': photo.mimeType,
			'Content-Length': bytes.byteLength.toString(),
			'Cache-Control': 'private, no-store',
			ETag: `"${photo.id}"`
		}
	});
};

// DELETE /api/photos/[id] - Delete a photo
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	const photo = await verifyPhotoAccess(params.id, user);

	logger.info('Deleting photo', { photoId: params.id, userId: user.id });

	// Delete from database first
	await db.delete(schema.photos).where(eq(schema.photos.id, params.id));

	// Then delete the stored bytes
	try {
		await deleteFile(photo.path);
		logger.info('Photo file deleted', { photoId: params.id, path: photo.path });
	} catch (err) {
		// Log but don't fail if file doesn't exist or can't be deleted
		logger.warn('Failed to delete photo file', {
			photoId: params.id,
			error: toError(err).message
		});
	}

	return json(successResponse({ deleted: true }));
};
