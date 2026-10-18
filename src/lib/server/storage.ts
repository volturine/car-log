import { platform } from '$platform';
import { FILE_UPLOAD } from '$lib/constants';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// better-auth user ids are 32 alphanumeric characters, not UUIDs.
const pathSegmentPattern = /^[A-Za-z0-9_-]{1,64}$/;

function isValidUUID(value: string): boolean {
	return uuidPattern.test(value);
}

function isPathSegment(value: string): boolean {
	return pathSegmentPattern.test(value);
}

/** The object key a photo is stored under: `<userId>/<repairId>/<filename>`. */
export function buildObjectKey(
	originalFilename: string,
	userId: string,
	repairId: string
): { filename: string; path: string } {
	// Both ids become path segments: no separators, dots or anything else that
	// could leave the owner's directory. Repairs are UUIDs we generate.
	if (!isPathSegment(userId) || !isValidUUID(repairId)) {
		throw new Error('Invalid userId or repairId');
	}

	const timestamp = Date.now();
	const randomBytes = crypto.getRandomValues(new Uint8Array(16));
	const random = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
	const safeExt = ext.replace(/[^a-z0-9]/gi, '').substring(0, FILE_UPLOAD.MAX_EXTENSION_LENGTH);
	const filename = `${timestamp}-${random}.${safeExt || 'jpg'}`;

	return {
		filename,
		path: `${userId}/${repairId}/${filename}`
	};
}

/** Stores an uploaded photo and returns the key to record on its database row. */
export async function saveFile(
	file: File,
	userId: string,
	repairId: string
): Promise<{ filename: string; path: string }> {
	const key = buildObjectKey(file.name, userId, repairId);
	await platform.storage.write(key.path, await file.arrayBuffer(), file.type);

	return key;
}

/** The stored bytes for a photo row's `path`, or null if they are gone. */
export function readFile(path: string): Promise<Uint8Array<ArrayBuffer> | null> {
	return platform.storage.read(path);
}

/** Removes the stored bytes for a photo row's `path`. */
export function deleteFile(path: string): Promise<void> {
	return platform.storage.remove(path);
}
