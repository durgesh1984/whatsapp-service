const fs = require('fs');
const { WhatsAppService } = require('../services/whatsappService');
const { SessionService } = require('../services/sessionService');
const { config } = require('../config/app');
async function logout(req, res) {
    try {
        const { id } = req.body;

        const connectionData = WhatsAppService.getConnection(id);

        if (connectionData && connectionData.sock) {
            await connectionData.sock.logout();
        }

        await SessionService.updateStatus(id, '0');
        WhatsAppService.removeConnection(id);

        const authDir = `${config.session.dir}/${id}`;
        if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to logout: ' + error.message
        });
    }
}

async function cleanExpiredSessions(req, res) {
    try {

        const expiredSessions = await SessionService.getExpiredSessions();
        let cleanedCount = 0;

        for (const session of expiredSessions) {
            const sessionId = session.token;

            WhatsAppService.removeConnection(sessionId);

            const authDir = `${config.session.dir}/${sessionId}`;
            if (fs.existsSync(authDir)) {
                fs.rmSync(authDir, { recursive: true, force: true });
            }

            await SessionService.markAsDeleted(sessionId);
            cleanedCount++;
        }

        res.json({
            success: true,
            message: `Cleaned ${cleanedCount} expired sessions`
        });

    } catch (error) {
        console.error('Error cleaning expired sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clean expired sessions: ' + error.message
        });
    }
}

module.exports = {
    logout,
    cleanExpiredSessions
};