/**
 * Smaira Logger
 * Structured logging with timestamps
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

const LOG_COLORS = {
    [LogLevel.DEBUG]: '\x1b[90m',
    [LogLevel.INFO]: '\x1b[36m',
    [LogLevel.WARN]: '\x1b[33m',
    [LogLevel.ERROR]: '\x1b[31m',
};

const RESET = '\x1b[0m';

class Logger {
    private level: LogLevel = LogLevel.INFO;

    setLevel(level: LogLevel) {
        this.level = level;
    }

    private log(level: LogLevel, message: string, data?: unknown) {
        if (level < this.level) return;

        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level].padEnd(5);
        const color = LOG_COLORS[level];

        const prefix = `${color}[${timestamp}] [${levelName}]${RESET}`;

        if (data !== undefined) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }

    debug(message: string, data?: unknown) {
        this.log(LogLevel.DEBUG, message, data);
    }

    info(message: string, data?: unknown) {
        this.log(LogLevel.INFO, message, data);
    }

    warn(message: string, data?: unknown) {
        this.log(LogLevel.WARN, message, data);
    }

    error(message: string, data?: unknown) {
        this.log(LogLevel.ERROR, message, data);
    }
}

export const logger = new Logger();
export default logger;
