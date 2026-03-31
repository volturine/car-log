import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { getFilePath } from '$lib/server/storage';
import { requireAuth, verifyOwnership, successResponse } from '$lib/server/api-utils';
import { eq } from 'drizzle-orm';
import { readFile, unlink } from 'fs/promises';
import { fileLogger } from '$lib/server/logger';

const logger = fileLogger.child('photos');

// GET /api/photos/[id] - Get a photo
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	const photo = await verifyOwnership(schema.photos, params.id, user.id, 'Photo');

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
		logger.error('Failed to read photo file', err as Error, { photoId: params.id });
		throw new Error('Failed to load photo');
	}
};

// DELETE /api/photos/[id] - Delete a photo
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	const photo = await verifyOwnership(schema.photos, params.id, user.id, 'Photo');

	logger.info('Deleting photo', { photoId: params.id, userId: user.id });

	// Delete from database first
	await db.delete(schema.photos).where(eq(schema.photos.id, params.id));

	// Then delete file from disk
	const filePath = getFilePath(photo.path);
	try {
		await unlink(filePath);
		logger.info('Photo file deleted', { photoId: params.id, path: photo.path });
	} catch (err) {
		// Log but don't fail if file doesn't exist or can't be deleted
		logger.warn('Failed to delete photo file', {
			photoId: params.id,
			error: (err as Error).message
		});
	}

	return json(successResponse({ deleted: true }));
};
