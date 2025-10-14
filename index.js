const express = require('express');
const bodyParser = require('body-parser');
const { config, validateConfig } = require('./config/app');
const { testDbConnection } = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(config.upload.dir));

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
    try {
        validateConfig();
        await testDbConnection();

        const { WhatsAppService } = require('./services/whatsappService');
        await WhatsAppService.restoreActiveSessions();

        app.listen(config.port, () => {
            logger.info({ port: config.port, event: 'server_started' }, `Server running on http://localhost:${config.port}`);
        });

    } catch (error) {
        logger.error({ error: error.message, stack: error.stack, event: 'server_start_failed' }, 'Error starting server');
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    logger.info({ event: 'server_shutdown', signal: 'SIGINT' }, 'Received SIGINT. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info({ event: 'server_shutdown', signal: 'SIGTERM' }, 'Received SIGTERM. Shutting down gracefully...');
    process.exit(0);
});

startServer().catch((error) => {
    logger.fatal({ error: error.message, stack: error.stack, event: 'unhandled_error' }, 'Unhandled error in startServer');
    process.exit(1);
});