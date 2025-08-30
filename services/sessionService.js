const { getDbConnection } = require('../config/database');

class SessionService {
    static async updateStatus(sessionId, status, scanId = null, scanName = null) {
        try {
            const connection = await getDbConnection();
            if (scanId !== null && scanName !== null) {
                await connection.execute(
                    'UPDATE wa_tokens SET status = ?, scan_id = ?, scan_name = ? WHERE token = ?',
                    [status, scanId, scanName, sessionId]
                );
            } else {
                await connection.execute(
                    'UPDATE wa_tokens SET status = ? WHERE token = ?',
                    [status, sessionId]
                );
            }
            await connection.end();
        } catch (error) {
            console.error('Error updating token status:', error);
        }
    }

    static async saveSession(sessionId) {
        try {
            const connection = await getDbConnection();

            const [existing] = await connection.execute(
                'SELECT id FROM wa_tokens WHERE token = ?',
                [sessionId]
            );
            
            if (existing.length > 0) {
                await connection.execute(
                    'UPDATE wa_tokens SET status = ?, delete_status = ? WHERE token = ?',
                    ['0', '0', sessionId]
                );
            } else {
                await connection.execute(
                    'INSERT INTO wa_tokens (token, status, created_at) VALUES (?, ?, NOW())',
                    [sessionId, '0']
                );
            }
            
            await connection.end();
        } catch (error) {
            console.error('Error saving session to database:', error);
        }
    }

    static async getSession(sessionId) {
        try {
            const connection = await getDbConnection();
            const [rows] = await connection.execute(
                'SELECT * FROM wa_tokens WHERE token = ? AND delete_status = "0"',
                [sessionId]
            );
            await connection.end();
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting session from database:', error);
            return null;
        }
    }

    static async getExpiredSessions() {
        try {
            const connection = await getDbConnection();
            const [rows] = await connection.execute(`
                SELECT token FROM wa_tokens 
                WHERE status = '0' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
                AND delete_status = '0'
            `);
            await connection.end();
            return rows;
        } catch (error) {
            console.error('Error getting expired sessions:', error);
            return [];
        }
    }

    static async markAsDeleted(sessionId) {
        try {
            const connection = await getDbConnection();
            await connection.execute(
                'UPDATE wa_tokens SET delete_status = "1" WHERE token = ?',
                [sessionId]
            );
            await connection.end();
        } catch (error) {
            console.error('Error marking session as deleted:', error);
        }
    }

    static async getActiveSessions() {
        try {
            const connection = await getDbConnection();
            const [rows] = await connection.execute(`
                SELECT token FROM wa_tokens 
                WHERE status = "1" AND delete_status = "0"
            `);
            await connection.end();
            return rows.map(row => row.token);
        } catch (error) {
            console.error('Error getting active sessions:', error);
            return [];
        }
    }
}

module.exports = {
    SessionService
};