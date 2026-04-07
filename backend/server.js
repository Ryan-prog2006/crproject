const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const classroomRoutes = require('./routes/classrooms');
const timetableRoutes = require('./routes/timetable');
const subjectRoutes = require('./routes/subjects');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');
const authenticate = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/auth', authRoutes);
app.use('/api/classrooms', authenticate, classroomRoutes);
app.use('/api/timetable', authenticate, timetableRoutes);
app.use('/api/subjects', authenticate, subjectRoutes);
app.use('/api/attendance', authenticate, attendanceRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Catch-all: serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Attendance Auto-Calculation Logic on startup
const autoBackfillAttendance = async () => {
    try {
        const [logs] = await db.query('SELECT id FROM attendance_log LIMIT 1');
        if (logs.length === 0) {
            console.log('Backfilling attendance records from 2026-01-02...');
            const startDate = new Date('2026-01-02');
            const today = new Date();
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            let curr = new Date(startDate);
            while (curr <= today) {
                const dayName = days[curr.getDay()];
                if (dayName !== 'Sunday') {
                    const [slots] = await db.query('SELECT subject_code, period_no FROM timetable WHERE day = ? AND subject_code IS NOT NULL', [dayName]);
                    for (const slot of slots) {
                        await db.query(
                            'INSERT INTO attendance_log (subject_code, date, period_no, status) VALUES (?, ?, ?, "conducted")',
                            [slot.subject_code, curr.toISOString().split('T')[0], slot.period_no]
                        );
                        await db.query('UPDATE subjects SET completed_classes = completed_classes + 1 WHERE code = ?', [slot.subject_code]);
                    }
                }
                curr.setDate(curr.getDate() + 1);
            }
            console.log('Backfill complete.');
        }
    } catch (err) {
        console.error('Error in auto-backfill:', err);
    }
};

// Auto-seed database if tables don't exist (for Railway deployment)
const autoSeed = async () => {
    try {
        const [tables] = await db.query("SHOW TABLES LIKE 'users'");
        if (tables.length === 0) {
            console.log('No tables found. Running seed script...');
            const fs = require('fs');
            const mysql2 = require('mysql2/promise');
            const seedConn = await mysql2.createConnection({
                host: process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost',
                port: process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306,
                user: process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
                password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '',
                multipleStatements: true
            });
            const scriptPath = path.join(__dirname, '..', 'database', 'smart_classroom.sql');
            const script = fs.readFileSync(scriptPath, 'utf8');
            await seedConn.query(script);
            await seedConn.end();
            console.log('Database seeded successfully!');
        } else {
            console.log('Database tables already exist, skipping seed.');
        }
    } catch (err) {
        console.error('Auto-seed error:', err.message);
    }
};

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await autoSeed();
});
