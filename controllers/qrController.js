const { WhatsAppService } = require('../services/whatsappService');
const { SessionService } = require('../services/sessionService');
const fs = require('fs');

async function getQRCode(req, res) {
    try {
        const sessionId = req.params.id;
        
        let sessionData = await SessionService.getSession(sessionId);
        
        if (!sessionData) {
            await SessionService.saveSession(sessionId);
            sessionData = await SessionService.getSession(sessionId);
        }

        const connectionData = WhatsAppService.getConnection(sessionId);
        
        if (connectionData && connectionData.isLoggedIn) {
            return res.json({
                status: true,
                loggedIn: true,
                qr: {
                    success: false,
                    message: 'Already logged in'
                }
            });
        }

        let connection = connectionData;
        if (!connection) {
            connection = await WhatsAppService.createConnection(sessionId);
            
            // Wait a bit for QR code to be generated
            await waitForQRCode(connection, 5000);
        }

        if (connection.qr) {
            res.json({
                status: true,
                loggedIn: false,
                qr: {
                    success: true,
                    img: connection.qr
                }
            });
        } else if (connection.isLoggedIn) {
            res.json({
                status: true,
                loggedIn: true,
                qr: {
                    success: false,
                    message: 'Already logged in'
                }
            });
        } else {
            res.json({
                status: false,
                loggedIn: false,
                qr: {
                    success: false,
                    message: 'QR code not ready yet, please try again in a moment'
                }
            });
        }
    } catch (error) {
        console.error('Error in getQRCode:', error);
        res.status(500).json({
            status: false,
            loggedIn: false,
            qr: {
                success: false,
                message: 'Internal server error'
            }
        });
    }
}

// Helper function to wait for QR code generation
function waitForQRCode(connection, timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkQR = () => {
            if (connection.qr || connection.isLoggedIn || (Date.now() - startTime) > timeout) {
                resolve();
            } else {
                setTimeout(checkQR, 100);
            }
        };
        
        checkQR();
    });
}

async function getFreshQRCode(req, res) {
    try {
        const sessionId = req.params.id;
        
        // Clear existing connection and session files
        WhatsAppService.clearConnection(sessionId);
        
        // Remove auth session files
        const authDir = `./auth_sessions/${sessionId}`;
        if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
        }
        
        // Update database status
        await SessionService.updateStatus(sessionId, '0');
        
        // Create fresh connection
        const connection = await WhatsAppService.createConnection(sessionId);
        
        // Wait for QR code to be generated
        await waitForQRCode(connection, 8000);
        
        if (connection.qr) {
            res.json({
                status: true,
                loggedIn: false,
                qr: {
                    success: true,
                    img: connection.qr
                }
            });
        } else {
            res.json({
                status: false,
                loggedIn: false,
                qr: {
                    success: false,
                    message: 'Failed to generate QR code, please try again'
                }
            });
        }
    } catch (error) {
        console.error('Error in getFreshQRCode:', error);
        res.status(500).json({
            status: false,
            loggedIn: false,
            qr: {
                success: false,
                message: 'Internal server error'
            }
        });
    }
}

module.exports = {
    getQRCode,
    getFreshQRCode
};