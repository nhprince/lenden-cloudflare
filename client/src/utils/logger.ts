type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
    // Check if we are in development mode
    private isDev = true;

    private log(level: LogLevel, message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        if (this.isDev) {
            switch (level) {
                case 'info':
                    console.info(formattedMessage, data || '');
                    break;
                case 'warn':
                    console.warn(formattedMessage, data || '');
                    break;
                case 'error':
                    console.error(formattedMessage, data || '');
                    break;
                case 'debug':
                    console.debug(formattedMessage, data || '');
                    break;
            }
        }

        // In production, we could send this to a remote logging service or a backend endpoint
        if (level === 'error') {
            this.reportError(message, data);
        }
    }

    private async reportError(message: string, data?: any) {
        // Placeholder for remote error reporting service integration (e.g. Sentry)
        // Or a custom backend endpoint: /api/logs/error
        try {
            // we skip actual network call here but this is where it would happen
        } catch (e) {
            // silently fail to avoid recursion
        }
    }

    info(message: string, data?: any) { this.log('info', message, data); }
    warn(message: string, data?: any) { this.log('warn', message, data); }
    error(message: string, data?: any) { this.log('error', message, data); }
    debug(message: string, data?: any) { this.log('debug', message, data); }
}

export const logger = new Logger();
