import { writeFile, mkdir } from 'fs/promises';
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

	// Create user directory
	const userDir = join(UPLOAD_DIR, userId);
	if (!existsSync(userDir)) {
		await mkdir(userDir, { recursive: true });
	}

	// Create repair directory
	const repairDir = join(userDir, repairId);
	if (!existsSync(repairDir)) {
		await mkdir(repairDir, { recursive: true });
	}

	// Generate unique filename
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 15);
	const ext = file.name.split('.').pop();
	const filename = `${timestamp}-${random}.${ext}`;
	const filePath = join(repairDir, filename);

	// Save file
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	await writeFile(filePath, buffer);

	// Return relative path for storage
	const relativePath = join(userId, repairId, filename);

	return {
		filename,
		path: relativePath
	};
}

// Get full file path
export function getFilePath(relativePath: string): string {
	return join(UPLOAD_DIR, relativePath);
}
