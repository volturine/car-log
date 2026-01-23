import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { getFilePath } from '$lib/server/storage';
import { eq, and } from 'drizzle-orm';
import { readFile } from 'fs/promises';

// GET /api/photos/[id] - Get a photo
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const [photo] = await db
		.select()
		.from(schema.photos)
		.where(and(eq(schema.photos.id, params.id), eq(schema.photos.userId, locals.user.id)))
		.limit(1);

	if (!photo) {
		throw error(404, 'Photo not found');
	}

	const filePath = getFilePath(photo.path);
	const fileBuffer = await readFile(filePath);

	return new Response(fileBuffer, {
		headers: {
			'Content-Type': photo.mimeType,
			'Content-Length': photo.size.toString(),
			'Cache-Control': 'public, max-age=31536000'
		}
	});
};

// DELETE /api/photos/[id] - Delete a photo
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const [photo] = await db
		.select()
		.from(schema.photos)
		.where(and(eq(schema.photos.id, params.id), eq(schema.photos.userId, locals.user.id)))
		.limit(1);

	if (!photo) {
		throw error(404, 'Photo not found');
	}

	// Delete from database
	await db.delete(schema.photos).where(eq(schema.photos.id, params.id));

	// Optionally delete from disk
	// const filePath = getFilePath(photo.path);
	// await unlink(filePath).catch(() => {});

	return new Response(null, { status: 204 });
};
