const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: 'pwtestdb',
      database: 'salondb'
    });
    console.log('Connected successfully');
    await conn.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
})();