import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { deleteFile, saveFile } from '$lib/server/storage';
import {
	requireAuth,
	verifyRepairAccess,
	successResponse,
	formatPhotosForResponse,
	writeBatch
} from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { generateId, toError } from '$lib/utils';
import { FILE_UPLOAD } from '$lib/constants';
import { ResultAsync } from 'neverthrow';

const logger = apiLogger.child('photos');

async function cleanup(files: Array<{ path: string }>): Promise<void> {
	await Promise.all(
		files.map(async (file) => {
			const result = await ResultAsync.fromPromise(deleteFile(file.path), toError);
			if (result.isErr()) {
				logger.warn('Failed to clean up photo upload', { error: result.error.message });
			}
		})
	);
}

// POST /api/photos - Upload photos for a repair
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals);

	const formData = await request.formData();
	const repairId = formData.get('repairId');
	if (typeof repairId !== 'string' || !repairId) {
		throw error(400, 'repairId is required');
	}

	const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);
	if (files.length === 0) {
		throw error(400, 'At least one file is required');
	}
	if (files.length > FILE_UPLOAD.MAX_FILES_PER_REQUEST) {
		throw error(400, `At most ${FILE_UPLOAD.MAX_FILES_PER_REQUEST} files are allowed`);
	}

	// Verify repair access
	await verifyRepairAccess(repairId, user);

	logger.info('Uploading photos', { repairId, userId: user.id, fileCount: files.length });

	// Validate, save files, then insert in one atomic batch
	const maxSize = FILE_UPLOAD.MAX_SIZE_BYTES;
	for (const file of files) {
		if (!file.size) throw error(400, 'Empty files not allowed');
		if (file.size > maxSize) throw error(400, `File exceeds ${maxSize / 1024 / 1024}MB`);
		if (!FILE_UPLOAD.ALLOWED_IMAGE_TYPES.some((type) => type === file.type)) {
			throw error(400, `Type ${file.type} not allowed`);
		}
	}

	// Save files to disk
	// Wait for every write before cleanup, including writes that finish after a failure.
	const results = await Promise.all(
		files.map((file) => ResultAsync.fromPromise(saveFile(file, user.id, repairId), toError))
	);
	const savedFiles = results.flatMap((result) => (result.isOk() ? [result.value] : []));
	if (results.some((result) => result.isErr())) {
		await cleanup(savedFiles);
		throw error(500, 'Failed to save photos');
	}

	const photoRows = files.map((file, i) => ({
		id: generateId(),
		repairId,
		userId: user.id,
		filename: savedFiles[i].filename,
		originalFilename: file.name,
		mimeType: file.type,
		size: file.size,
		path: savedFiles[i].path,
		createdAt: new Date()
	}));
	const inserted = await ResultAsync.fromPromise(
		writeBatch([db.insert(schema.photos).values(photoRows)]),
		toError
	);
	if (inserted.isErr()) {
		await cleanup(savedFiles);
		throw error(500, 'Failed to save photos');
	}
	const uploadedPhotos = formatPhotosForResponse(photoRows);

	logger.info('Photos uploaded', { repairId, userId: user.id, count: uploadedPhotos.length });

	return json(successResponse(uploadedPhotos, 201), { status: 201 });
};
