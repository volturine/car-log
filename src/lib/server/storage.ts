import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Ensure upload directory exists
export async function ensureUploadDir() {
	if (!existsSync(UPLOAD_DIR)) {
		await mkdir(UPLOAD_DIR, { recursive: true });
	}
}

// Save file to disk
export async function saveFile(
	file: File,
	userId: string,
	repairId: string
): Promise<{ filename: string; path: string }> {
	await ensureUploadDir();

	// Validate userId and repairId to prevent path traversal
	if (!isValidUUID(userId) || !isValidUUID(repairId)) {
		throw new Error('Invalid userId or repairId');
	}

	// Create user directory
	const userDir = join(UPLOAD_DIR, userId);
	if (!existsSync(userDir)) {
		await mkdir(userDir, { recursive: true, mode: 0o755 });
	}

	// Create repair directory
	const repairDir = join(userDir, repairId);
	if (!existsSync(repairDir)) {
		await mkdir(repairDir, { recursive: true, mode: 0o755 });
	}

	// Generate cryptographically secure unique filename
	const timestamp = Date.now();
	const randomBytes = crypto.getRandomValues(new Uint8Array(16));
	const random = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

	// Sanitize extension to prevent command injection
	const safeExt = ext.replace(/[^a-z0-9]/gi, '').substring(0, 10);
	const filename = `${timestamp}-${random}.${safeExt}`;
	const filePath = join(repairDir, filename);

	// Save file with restricted permissions
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	await writeFile(filePath, buffer, { mode: 0o644 });

	// Return relative path for storage
	const relativePath = join(userId, repairId, filename);

	return {
		filename,
		path: relativePath
	};
}

// UUID validation helper
function isValidUUID(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

// Get full file path
export function getFilePath(relativePath: string): string {
	return join(UPLOAD_DIR, relativePath);
}

export async function cleanupPhotoFiles(
	photos: Array<{ id: string; path: string }>
): Promise<void> {
	await Promise.allSettled(
		photos.map(async (photo) => {
			const filePath = getFilePath(photo.path);
			try {
				await unlink(filePath);
			} catch {
				// Non-fatal: file may already be gone
			}
		})
	);
}
