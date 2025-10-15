const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const makeWASocket = require('@whiskeysockets/baileys').default;
const QRCode = require('qrcode');
const fs = require('fs');
const { SessionService } = require('./sessionService');
const { config } = require('../config/app');
const logger = require('../utils/logger');

class WhatsAppService {
    static activeConnections = new Map();

    static async createConnection(sessionId) {
        try {
            const authDir = `${config.session.dir}/${sessionId}`;
            if (!fs.existsSync(authDir)) {
                fs.mkdirSync(authDir, { recursive: true });
            }

            const { state, saveCreds } = await useMultiFileAuthState(authDir);
            
            const isAlreadyLoggedIn = state.creds?.registered;
            const baileyLogger = {
                error: msg => logger.error({ baileys: true }, msg),
                warn: msg => logger.warn({ baileys: true }, msg),
                info: msg => logger.debug({ baileys: true }, msg),
                debug: msg => {},
                trace: msg => {},
                child: () => baileyLogger
            };
            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: config.whatsapp.printQRInTerminal,
                logger: baileyLogger
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
                        logger.info({ sessionId, event: 'qr_generated' }, 'QR Code generated for session');
                    } catch (error) {
                        logger.error({ sessionId, error: error.message }, 'Error generating QR code');
                    }
                }
                
                if (connection === 'close') {
                    const disconnectReason = lastDisconnect?.error?.output?.statusCode;
                    const errorMessage = lastDisconnect?.error?.message || 'Unknown error';

                    // Map status codes to human-readable reasons
                    const errorMapping = {
                        [DisconnectReason.loggedOut]: '401 - User logged out',
                        [DisconnectReason.forbidden]: '403 - Access forbidden',
                        405: '405 - Method not allowed (Protocol/Version issue)',
                        [DisconnectReason.badSession]: '500 - Bad/Corrupted session',
                        [DisconnectReason.connectionReplaced]: '440 - Connection replaced (Active elsewhere)',
                        [DisconnectReason.connectionClosed]: '428 - Connection closed',
                        [DisconnectReason.connectionLost]: '408 - Connection lost',
                        [DisconnectReason.restartRequired]: '515 - Restart required',
                        [DisconnectReason.timedOut]: '408 - Connection timed out'
                    };

                    const errorDescription = errorMapping[disconnectReason] || `${disconnectReason} - Unknown error`;

                    // Enhanced logging for disconnect events
                    logger.warn({
                        sessionId,
                        event: 'connection_closed',
                        statusCode: disconnectReason,
                        errorType: errorDescription,
                        errorMessage,
                        errorDetails: lastDisconnect?.error ? {
                            message: lastDisconnect.error.message,
                            statusCode: lastDisconnect.error.output?.statusCode,
                            payload: lastDisconnect.error.output?.payload,
                            stack: lastDisconnect.error.stack?.split('\n').slice(0, 3)
                        } : null
                    }, 'Connection closed');

                    // Don't reconnect if logged out, bad session, forbidden, connection replaced, or 405 error
                    const shouldReconnect = disconnectReason !== DisconnectReason.loggedOut &&
                                          disconnectReason !== DisconnectReason.badSession &&
                                          disconnectReason !== DisconnectReason.forbidden &&
                                          disconnectReason !== DisconnectReason.connectionReplaced &&
                                          disconnectReason !== 405;

                    if (shouldReconnect) {
                        logger.info({
                            sessionId,
                            event: 'reconnect_scheduled',
                            delayMs: config.whatsapp.reconnectDelay
                        }, 'Scheduling reconnection attempt');
                        setTimeout(() => {
                            WhatsAppService.createConnection(sessionId);
                        }, config.whatsapp.reconnectDelay);
                    } else {
                        // Determine recommended action based on error type
                        let recommendedAction = [];
                        if (disconnectReason === 405) {
                            recommendedAction = [
                                'Update @whiskeysockets/baileys to latest version',
                                'Delete session folder and re-authenticate',
                                'Check if WhatsApp protocol has changed'
                            ];
                        } else if (disconnectReason === DisconnectReason.badSession) {
                            recommendedAction = [
                                `Delete corrupted session folder: ${authDir}`,
                                'Re-scan QR code to create fresh session'
                            ];
                        } else if (disconnectReason === DisconnectReason.connectionReplaced) {
                            recommendedAction = [
                                'Close other WhatsApp Web/Desktop connections',
                                'Check for duplicate service instances'
                            ];
                        } else if (disconnectReason === DisconnectReason.loggedOut) {
                            recommendedAction = ['Re-authenticate by scanning QR code'];
                        }

                        logger.error({
                            sessionId,
                            event: 'terminal_error',
                            statusCode: disconnectReason,
                            errorType: errorDescription,
                            recommendedAction
                        }, 'Terminal error - not reconnecting, marking session inactive');

                        await SessionService.updateStatus(sessionId, '0');
                        WhatsAppService.activeConnections.delete(sessionId);
                    }
                    connectionData.isConnected = false;
                    connectionData.isLoggedIn = false;
                } else if (connection === 'open') {
                    logger.info({
                        sessionId,
                        event: 'connection_established',
                        userId: sock.user?.id || 'N/A',
                        userName: sock.user?.name || 'N/A'
                    }, 'Connection successfully established');

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
                
                if (update.me && connectionData.isLoggedIn) {
                    const scanID = update.me.id || null;
                    const scanName = update.me.name || null;
                    
                    await SessionService.updateStatus(sessionId, '1', scanID, scanName);
                }
            });

            WhatsAppService.activeConnections.set(sessionId, connectionData);
            return connectionData;
        } catch (error) {
            logger.error({ sessionId, error: error.message, stack: error.stack }, 'Error creating WhatsApp connection');
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
                logger.info({ sessionId, event: 'connection_cleared' }, 'Socket connection ended');
            } catch (error) {
                logger.error({ sessionId, error: error.message }, 'Error ending socket');
            }
        }
        WhatsAppService.activeConnections.delete(sessionId);
    }

    static async restoreActiveSessions() {
        try {
            logger.info({ event: 'session_restoration_start' }, 'Starting session restoration');
            const { SessionService } = require('./sessionService');
            const activeSessions = await SessionService.getActiveSessions();

            logger.info({
                event: 'sessions_found',
                count: activeSessions.length,
                sessions: activeSessions
            }, `Found ${activeSessions.length} active sessions in database`);

            if (activeSessions.length === 0) {
                logger.info({ event: 'no_sessions_to_restore' }, 'No active sessions to restore');
                return;
            }

            for (const sessionId of activeSessions) {
                logger.info({ sessionId, event: 'session_restore_attempt' }, 'Attempting to restore session');
                try {
                    const authDir = `${config.session.dir}/${sessionId}`;
                    logger.debug({ sessionId, authDir }, 'Checking auth directory');

                    if (!fs.existsSync(authDir)) {
                        logger.warn({
                            sessionId,
                            authDir,
                            event: 'auth_dir_missing'
                        }, 'Auth directory does not exist, marking session as inactive');
                        await SessionService.updateStatus(sessionId, '0');
                        continue;
                    }

                    await WhatsAppService.createConnection(sessionId);
                    logger.info({ sessionId, event: 'session_restore_success' }, 'Successfully initiated session restoration');
                } catch (error) {
                    logger.error({
                        sessionId,
                        event: 'session_restore_failed',
                        error: error.message,
                        stack: error.stack
                    }, 'Failed to restore session');
                    await SessionService.updateStatus(sessionId, '0');
                }
            }

            logger.info({
                event: 'session_restoration_complete',
                activeConnections: WhatsAppService.getActiveConnectionsCount()
            }, 'Session restoration completed');
        } catch (error) {
            logger.error({
                event: 'session_restoration_error',
                error: error.message,
                stack: error.stack
            }, 'Critical error during session restoration');
        }
    }
}

module.exports = {
    WhatsAppService
};