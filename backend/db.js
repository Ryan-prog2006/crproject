const mysql = require('mysql2');

let poolConfig;

if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
  const dbUrl = new URL(process.env.MYSQL_URL || process.env.DATABASE_URL);
  poolConfig = {
    host: dbUrl.hostname,
    port: dbUrl.port,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace('/', ''),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else {
  poolConfig = {
    host: process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'smart_classroom',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

const pool = mysql.createPool(poolConfig);
module.exports = pool.promise();
