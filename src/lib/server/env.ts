import { isAbsolute, join } from 'path';

const portDefault = 3000;
const dbDefault = './sqlite.db';

export function getPort(value: string | undefined = process.env.PORT): number {
	const port = Number(value);

	if (!Number.isInteger(port)) {
		return portDefault;
	}

	if (port < 1 || port > 65535) {
		return portDefault;
	}

	return port;
}

export function getDevUrl(): string {
	return `http://localhost:${getPort()}`;
}

export function getDatabaseUrl(): string {
	return process.env.DATABASE_URL || dbDefault;
}

export function getDatabasePath(): string {
	const url = getDatabaseUrl();

	if (isAbsolute(url)) {
		return url;
	}

	return join(process.cwd(), url);
}
