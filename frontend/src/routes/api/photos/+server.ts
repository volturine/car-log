import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { saveFile } from '$lib/server/storage';
import { eq, and } from 'drizzle-orm';

// POST /api/photos - Upload photos for a repair
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const formData = await request.formData();
	const repairId = formData.get('repairId') as string;
	const files = formData.getAll('files') as File[];

	if (!repairId) {
		throw error(400, 'repairId is required');
	}

	// Verify repair belongs to user
	const [repair] = await db
		.select()
		.from(schema.repairs)
		.where(and(eq(schema.repairs.id, repairId), eq(schema.repairs.userId, locals.user.id)))
		.limit(1);

	if (!repair) {
		throw error(404, 'Repair not found');
	}

	const uploadedPhotos = [];

	for (const file of files) {
		if (file.size === 0) continue;

		// Save file to disk
		const { filename, path } = await saveFile(file, locals.user.id, repairId);

		// Save to database
		const photo = {
			id: crypto.randomUUID(),
			repairId,
			userId: locals.user.id,
			filename,
			originalFilename: file.name,
			mimeType: file.type,
			size: file.size,
			path,
			createdAt: new Date()
		};

		await db.insert(schema.photos).values(photo);
		uploadedPhotos.push({ id: photo.id, url: `/api/photos/${photo.id}` });
	}

	return json(uploadedPhotos, { status: 201 });
};
