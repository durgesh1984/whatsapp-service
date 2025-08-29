const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_SCHEMA
};

async function testDbConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.ping();
        await connection.end();
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
}

async function getDbConnection() {
    try {
        return await mysql.createConnection(dbConfig);
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
}

async function initDatabase() {
    try {
        console.log('Initializing database...');
        const connection = await mysql.createConnection(dbConfig);

        // await connection.execute('DROP TABLE IF EXISTS messages');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS wa_tokens (
                id INT NOT NULL AUTO_INCREMENT,
                token VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
                status ENUM('0','1') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '0' COMMENT '0="not scanned", 1="scanned"',
                scan_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
                scan_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
                delete_status ENUM('0','1') COLLATE utf8mb4_general_ci DEFAULT '0',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        console.log('Database initialized successfully');
        await connection.end();
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

module.exports = {
    dbConfig,
    getDbConnection,
    testDbConnection,
    initDatabase
};