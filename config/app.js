require('dotenv').config();

const config = {
    port: process.env.PORT || 8080,
    upload: {
        dir: './uploads',
        maxSize: 50 * 1024 * 1024 // 50MB
    },
    session: {
        dir: './auth_sessions',
        cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
    },
    whatsapp: {
        printQRInTerminal: false,
        reconnectDelay: 5000
    }
};

function validateConfig() {
    const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

module.exports = {
    config,
    validateConfig
};