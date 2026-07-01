import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { schema } from '$lib/server/db';
import { saveFile } from '$lib/server/storage';
import { requireAuth, verifyRepairAccess, transaction } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils';
import { FILE_UPLOAD } from '$lib/constants';

const logger = apiLogger.child('photos');

export const POST: RequestHandler = async ({ request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const formData = await request.formData();
	const repairId = formData.get('repairId');
	if (typeof repairId !== 'string' || !repairId) {
		return json({ success: false, error: 'repairId is required' }, { status: 400 });
	}

	const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);
	if (files.length === 0) {
		return json({ success: false, error: 'At least one file is required' }, { status: 400 });
	}

	const accessResult = await verifyRepairAccess(repairId, user);
	if (accessResult.isErr()) {
		return json(
			{ success: false, error: accessResult.error.message },
			{ status: accessResult.error.status }
		);
	}

	logger.info('Uploading photos', { repairId, userId: user.id, fileCount: files.length });

	const maxSize = FILE_UPLOAD.MAX_SIZE_BYTES;
	for (const file of files) {
		if (!file.size) {
			return json({ success: false, error: 'Empty files not allowed' }, { status: 400 });
		}
		if (file.size > maxSize) {
			return json(
				{ success: false, error: `File exceeds ${maxSize / 1024 / 1024}MB` },
				{ status: 400 }
			);
		}
		if (!FILE_UPLOAD.ALLOWED_IMAGE_TYPES.some((type) => type === file.type)) {
			return json({ success: false, error: `Type ${file.type} not allowed` }, { status: 400 });
		}
	}

	const savedFiles = await Promise.all(files.map((file) => saveFile(file, user.id, repairId)));

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

	return json({ success: true, data: uploadedPhotos }, { status: 201 });
};
