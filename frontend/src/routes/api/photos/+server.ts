import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { saveFile } from '$lib/server/storage';
import { eq } from 'drizzle-orm';
import { requireAuth, verifyOwnership, successResponse, transaction } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils/helpers';
import { FILE_UPLOAD } from '$lib/constants';

const logger = apiLogger.child('photos');

// POST /api/photos - Upload photos for a repair
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals);

	const formData = await request.formData();
	const repairId = formData.get('repairId') as string;
	const files = formData.getAll('files') as File[];

	if (!repairId) {
		throw error(400, 'repairId is required');
	}

	if (!files || files.length === 0) {
		throw error(400, 'At least one file is required');
	}

	// Verify repair belongs to user
	await verifyOwnership(schema.repairs, repairId, user.id, 'Repair');

	logger.info('Uploading photos', { repairId, userId: user.id, fileCount: files.length });

	// Validate all files before uploading any
	for (const file of files) {
		if (file.size === 0) {
			throw error(400, 'Empty files are not allowed');
		}

		if (file.size > FILE_UPLOAD.MAX_FILE_SIZE) {
			throw error(400, `File ${file.name} exceeds maximum size of ${FILE_UPLOAD.MAX_FILE_SIZE / 1024 / 1024}MB`);
		}

		if (!FILE_UPLOAD.ALLOWED_TYPES.includes(file.type)) {
			throw error(400, `File type ${file.type} is not allowed`);
		}
	}

	// Upload all photos in a transaction
	const uploadedPhotos = await transaction(async () => {
		const photos = [];

		for (const file of files) {
			// Save file to disk
			const { filename, path } = await saveFile(file, user.id, repairId);

			// Save to database
			const photo = {
				id: generateId(),
				repairId,
				userId: user.id,
				filename,
				originalFilename: file.name,
				mimeType: file.type,
				size: file.size,
				path,
				createdAt: new Date()
			};

			await db.insert(schema.photos).values(photo);
			photos.push({ id: photo.id, url: `/api/photos/${photo.id}` });

			logger.debug('Photo uploaded', { photoId: photo.id, filename: file.name, size: file.size });
		}

		return photos;
	});

	logger.info('Photos uploaded', { repairId, userId: user.id, count: uploadedPhotos.length });

	return json(successResponse(uploadedPhotos, 201), { status: 201 });
};
