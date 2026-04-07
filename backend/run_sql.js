const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
        password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '',
        multipleStatements: true
    });
    console.log('Connected to MySQL. Running seed script...');
    const scriptPath = path.join(__dirname, '../database/smart_classroom.sql');
    const script = fs.readFileSync(scriptPath, 'utf8');
    await connection.query(script);
    console.log('Seed executed successfully.');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
