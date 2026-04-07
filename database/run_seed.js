const fs = require('fs');
const mysql = require('mysql2/promise');

async function seed() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        multipleStatements: true
    });
    console.log('Connected to MySQL. Running seed script...');
    const script = fs.readFileSync('database/smart_classroom.sql', 'utf8');
    await connection.query(script);
    console.log('Seed executed successfully.');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
