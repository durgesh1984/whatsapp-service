const pino = require('pino');

// Configure pino logger with pretty printing in development
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false
        }
    } : undefined,
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        }
    }
});

module.exports = logger;
