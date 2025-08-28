const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const { WhatsAppService } = require('../services/whatsappService');
const { formatPhoneNumber } = require('../utils/phoneUtils');
const { config } = require('../config/app');

async function sendTextMessage(req, res) {
    try {
        const { id, number, message } = req.body;
        console.log(`POST /send-message for session: ${id}`);

        const connectionData = WhatsAppService.getConnection(id);
        
        if (!connectionData || !connectionData.isLoggedIn) {
            return res.status(400).json({
                success: false,
                message: 'Session not found or not logged in'
            });
        }

        const jid = formatPhoneNumber(number);
        const decodedMessage = message.replace(/\\n/g, '\n');
        await connectionData.sock.sendMessage(jid, { text: decodedMessage });

        res.json({
            success: true,
            message: 'Message sent successfully'
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message: ' + error.message
        });
    }
}


async function sendMediaFromURL(req, res) {
    try {
        const { id, number, filePath, caption } = req.body;
        console.log(`POST /send-media for session: ${id}`);

        const connectionData = WhatsAppService.getConnection(id);
        
        if (!connectionData || !connectionData.isLoggedIn) {
            return res.status(400).json({
                success: false,
                message: 'Session not found or not logged in'
            });
        }

        // Download file from URL
        const tempFileName = `temp_${Date.now()}_${Math.round(Math.random() * 1E9)}`;
        const tempFilePath = path.join(config.upload.dir, tempFileName);
        
        await downloadFile(filePath, tempFilePath);
        
        const stats = fs.statSync(tempFilePath);
        if (stats.size > config.upload.maxSize) {
            fs.unlinkSync(tempFilePath);
            return res.status(400).json({
                success: false,
                message: 'File size exceeds limit'
            });
        }

        const jid = formatPhoneNumber(number);
        
        // Determine media type from URL
        const urlLower = filePath.toLowerCase();
        let mediaType = 'document';
        
        if (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || urlLower.includes('.png') || urlLower.includes('.gif') || urlLower.includes('.webp')) {
            mediaType = 'image';
        } else if (urlLower.includes('.mp4') || urlLower.includes('.avi') || urlLower.includes('.mov') || urlLower.includes('.webm')) {
            mediaType = 'video';
        } else if (urlLower.includes('.mp3') || urlLower.includes('.wav') || urlLower.includes('.ogg') || urlLower.includes('.m4a')) {
            mediaType = 'audio';
        }

        const mediaMessage = {};
        mediaMessage[mediaType] = fs.readFileSync(tempFilePath);
        mediaMessage.caption = (caption || '').replace(/\\n/g, '\n');
        
        if (mediaType === 'document') {
            mediaMessage.document = mediaMessage[mediaType];
            delete mediaMessage[mediaType];
            mediaMessage.fileName = path.basename(filePath);
        }

        await connectionData.sock.sendMessage(jid, mediaMessage);

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

        res.json({
            success: true,
            message: 'Media sent successfully'
        });

    } catch (error) {
        console.error('Error sending media from URL:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send media: ' + error.message
        });
    }
}

function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(filePath);
        
        client.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(filePath, () => {});
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = {
    sendTextMessage,
    sendMediaFromURL
};