const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const makeWASocket = require('@whiskeysockets/baileys').default;
const QRCode = require('qrcode');
const fs = require('fs');
const { SessionService } = require('./sessionService');
const { config } = require('../config/app');

class WhatsAppService {
    static activeConnections = new Map();

    static async createConnection(sessionId) {
        try {
            console.log(`Creating WhatsApp connection for session: ${sessionId}`);
            const authDir = `${config.session.dir}/${sessionId}`;
            if (!fs.existsSync(authDir)) {
                fs.mkdirSync(authDir, { recursive: true });
            }

            const { state, saveCreds } = await useMultiFileAuthState(authDir);
            
            // Check if already logged in
            const isAlreadyLoggedIn = state.creds?.registered;
            
            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: config.whatsapp.printQRInTerminal
            });

            const connectionData = {
                sock,
                saveCreds,
                qr: null,
                isConnected: false,
                isLoggedIn: isAlreadyLoggedIn || false,
                sessionId
            };

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    try {
                        connectionData.qr = await QRCode.toDataURL(qr);
                        console.log(`QR Code generated for session: ${sessionId}`);
                    } catch (error) {
                        console.error('Error generating QR code:', error);
                    }
                }
                
                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log(`Connection closed for ${sessionId}:`, lastDisconnect.error, ', reconnecting:', shouldReconnect);
                    
                    if (shouldReconnect) {
                        setTimeout(() => {
                            WhatsAppService.createConnection(sessionId);
                        }, config.whatsapp.reconnectDelay);
                    } else {
                        await SessionService.updateStatus(sessionId, '0');
                        WhatsAppService.activeConnections.delete(sessionId);
                    }
                    connectionData.isConnected = false;
                    connectionData.isLoggedIn = false;
                } else if (connection === 'open') {
                    console.log(`WhatsApp connection opened for session: ${sessionId}`);
                    connectionData.isConnected = true;
                    connectionData.isLoggedIn = true;
                    connectionData.qr = null;
                    
                    const scanID = sock.user?.id || null;
                    const scanName = sock.user?.name || null;
                    
                    await SessionService.updateStatus(sessionId, '1', scanID, scanName);
                }
            });

            sock.ev.on('creds.update', async (update) => {
                saveCreds();
                
                // When user information becomes available, update scan_id and scan_name
                if (update.me && connectionData.isLoggedIn) {
                    const scanID = update.me.id || null;
                    const scanName = update.me.name || null;
                    
                    console.log(`Updating scan info for ${sessionId}: ID=${scanID}, Name=${scanName}`);
                    await SessionService.updateStatus(sessionId, '1', scanID, scanName);
                }
            });

            WhatsAppService.activeConnections.set(sessionId, connectionData);
            return connectionData;
        } catch (error) {
            console.error(`Error creating WhatsApp connection for ${sessionId}:`, error);
            throw error;
        }
    }

    static getConnection(sessionId) {
        return WhatsAppService.activeConnections.get(sessionId);
    }

    static removeConnection(sessionId) {
        WhatsAppService.activeConnections.delete(sessionId);
    }

    static getActiveConnectionsCount() {
        return WhatsAppService.activeConnections.size;
    }

    static clearConnection(sessionId) {
        const connection = WhatsAppService.activeConnections.get(sessionId);
        if (connection && connection.sock) {
            try {
                connection.sock.end();
            } catch (error) {
                console.error('Error ending socket:', error);
            }
        }
        WhatsAppService.activeConnections.delete(sessionId);
    }

    static async restoreActiveSessions() {
        try {
            const { SessionService } = require('./sessionService');
            const activeSessions = await SessionService.getActiveSessions();
            
            console.log(`Restoring ${activeSessions.length} active sessions...`);
            
            for (const sessionId of activeSessions) {
                try {
                    await WhatsAppService.createConnection(sessionId);
                    console.log(`Restored session: ${sessionId}`);
                } catch (error) {
                    console.error(`Failed to restore session ${sessionId}:`, error);
                    // Mark as inactive in database if restoration fails
                    await SessionService.updateStatus(sessionId, '0');
                }
            }
            
            console.log('Session restoration completed');
        } catch (error) {
            console.error('Error during session restoration:', error);
        }
    }
}

module.exports = {
    WhatsAppService
};