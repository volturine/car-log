import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { schema } from '$lib/server/db';
import { saveFile } from '$lib/server/storage';
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

	// Validate, save files, then insert in transaction
	const maxSize = FILE_UPLOAD.MAX_SIZE_BYTES;
	for (const file of files) {
		if (!file.size) throw error(400, 'Empty files not allowed');
		if (file.size > maxSize) throw error(400, `File exceeds ${maxSize / 1024 / 1024}MB`);
		if (!FILE_UPLOAD.ALLOWED_IMAGE_TYPES.some((type) => type === file.type)) {
			throw error(400, `Type ${file.type} not allowed`);
		}
	}

	// Save files to disk
	const savedFiles = await Promise.all(files.map((file) => saveFile(file, user.id, repairId)));

	// Insert all photos in single transaction
	const uploadedPhotos = transaction((tx) =>
		files.map((file, i) => {
			const photo = {
				id: generateId(),
				repairId,
				userId: user.id,
				filename: savedFiles[i].filename,
				originalFilename: file.name,
				mimeType: file.type,
				size: file.size,
				path: savedFiles[i].path,
				createdAt: new Date()
			};
			tx.insert(schema.photos).values(photo).run();
			return { id: photo.id, url: `/api/photos/${photo.id}` };
		})
	);

	logger.info('Photos uploaded', { repairId, userId: user.id, count: uploadedPhotos.length });

	return json(successResponse(uploadedPhotos, 201), { status: 201 });
};
