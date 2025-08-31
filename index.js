const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { config, validateConfig } = require('./config/app');
const { testDbConnection } = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(config.upload.dir));

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
    try {
        validateConfig();
        //await testDbConnection();

        const { WhatsAppService } = require('./services/whatsappService');
        await WhatsAppService.restoreActiveSessions();

        app.listen(config.port, () => {
            console.log(`🚀 Server running on http://localhost:${config.port}`);
        });

    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Shutting down gracefully...');
    process.exit(0);
});

startServer().catch((error) => {
    console.error('Unhandled error in startServer:', error);
    process.exit(1);
});