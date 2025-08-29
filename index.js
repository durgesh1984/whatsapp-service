const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { config, validateConfig } = require('./config/app');
const { initDatabase } = require('./config/database');
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
        console.log('Starting WhatsApp Bot API Server...');
        
        validateConfig();
        console.log('Configuration validated');
        
        await initDatabase();
        console.log('Database initialized');
        
        const { WhatsAppService } = require('./services/whatsappService');
        await WhatsAppService.restoreActiveSessions();
        
        app.listen(config.port, () => {
            console.log(`WhatsApp Bot API Server running on http://localhost:${config.port}`);
            console.log('Available endpoints:');
            console.log('GET  /get-qr/:id - Get QR code for login');
            console.log('GET  /get-fresh-qr/:id - Generate fresh QR code');
            console.log('POST /send-message - Send text message');
            console.log('POST /send-media - Send media from URL');
            console.log('POST /logout - Logout session');
            console.log('POST /clean-expired - Clean expired sessions');
            console.log('GET  /health - Health check');
            console.log('\nBackward compatibility routes also available without /api prefix');
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