/**
 * Structured logging utility for server-side operations
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
	level: LogLevel;
	context: string;
	message: string;
	timestamp: string;
	data?: any;
	error?: {
		message: string;
		stack?: string;
		name?: string;
	};
	userId?: string;
	requestId?: string;
}

class Logger {
	constructor(private context: string) {}

	private log(level: LogLevel, message: string, data?: any, error?: Error) {
		const entry: LogEntry = {
			level,
			context: this.context,
			message,
			timestamp: new Date().toISOString(),
			...(data && { data }),
			...(error && {
				error: {
					message: error.message,
					stack: error.stack,
					name: error.name
				}
			})
		};

		const output = JSON.stringify(entry);

		switch (level) {
			case 'ERROR':
				console.error(output);
				break;
			case 'WARN':
				console.warn(output);
				break;
			case 'INFO':
				console.info(output);
				break;
			case 'DEBUG':
				console.debug(output);
				break;
		}
	}

	debug(message: string, data?: any) {
		if (process.env.NODE_ENV === 'development') {
			this.log('DEBUG', message, data);
		}
	}

	info(message: string, data?: any) {
		this.log('INFO', message, data);
	}

	warn(message: string, data?: any) {
		this.log('WARN', message, data);
	}

	error(message: string, error?: Error, data?: any) {
		this.log('ERROR', message, data, error);
	}

	// Create child logger with additional context
	child(childContext: string) {
		return new Logger(`${this.context}:${childContext}`);
	}
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
	return new Logger(context);
}

// Export common logger instances
export const apiLogger = createLogger('api');
export const authLogger = createLogger('auth');
export const dbLogger = createLogger('db');
export const fileLogger = createLogger('file');
