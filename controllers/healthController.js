const os = require('os');
const { WhatsAppService } = require('../services/whatsappService');

function healthCheck(_req, res) {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();

    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        activeConnections: WhatsAppService.getActiveConnectionsCount(),
        system: {
            memory: {
                used: Math.round(usedMemory / 1024 / 1024), // MB
                free: Math.round(freeMemory / 1024 / 1024), // MB
                total: Math.round(totalMemory / 1024 / 1024), // MB
                usage: Math.round((usedMemory / totalMemory) * 100) // percentage
            },
            process: {
                memoryUsage: {
                    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                    external: Math.round(memUsage.external / 1024 / 1024) // MB
                },
                cpuUsage: {
                    user: Math.round(cpuUsage.user / 1000), // microseconds to milliseconds
                    system: Math.round(cpuUsage.system / 1000) // microseconds to milliseconds
                }
            },
            loadAverage: {
                '1min': Math.round(loadAvg[0] * 100) / 100,
                '5min': Math.round(loadAvg[1] * 100) / 100,
                '15min': Math.round(loadAvg[2] * 100) / 100
            },
            uptime: Math.round(process.uptime()), // seconds
            platform: os.platform(),
            nodeVersion: process.version
        }
    });
}

module.exports = {
    healthCheck
};