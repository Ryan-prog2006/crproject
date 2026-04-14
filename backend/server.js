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
const uploadRoutes = require('./routes/upload');
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
app.use('/api/upload', authenticate, uploadRoutes);

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
                    const [slots] = await db.query('SELECT user_id, subject_code, period_no FROM timetable WHERE day = ? AND subject_code IS NOT NULL AND subject_code != ""', [dayName]);
                    for (const slot of slots) {
                        await db.query(
                            'INSERT INTO attendance_log (user_id, subject_code, date, period_no, status) VALUES (?, ?, ?, ?, "conducted")',
                            [slot.user_id, slot.subject_code, curr.toISOString().split('T')[0], slot.period_no]
                        );
                        await db.query('UPDATE subjects SET completed_classes = completed_classes + 1 WHERE code = ? AND user_id = ?', [slot.subject_code, slot.user_id]);
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

// Seed helper function
const runSeed = async () => {
    const fs = require('fs');
    const mysql2 = require('mysql2/promise');
    let seedConfig;
    if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
        const dbUrl = new URL(process.env.MYSQL_URL || process.env.DATABASE_URL);
        seedConfig = {
            host: dbUrl.hostname,
            port: dbUrl.port,
            user: dbUrl.username,
            password: dbUrl.password,
            database: dbUrl.pathname.replace('/', ''),
            multipleStatements: true
        };
    } else {
        seedConfig = {
            host: process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost',
            port: process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
            password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'smart_classroom',
            multipleStatements: true
        };
    }
    const seedConn = await mysql2.createConnection(seedConfig);
    const scriptPath = path.join(__dirname, '..', 'database', 'smart_classroom.sql');
    const script = fs.readFileSync(scriptPath, 'utf8');
    await seedConn.query(script);
    await seedConn.end();
};

// Auto-seed database if no user data exists (for Railway deployment)
const autoSeed = async () => {
    try {
        let needsSeed = false;
        try {
            const [rows] = await db.query("SELECT COUNT(*) as cnt FROM users");
            needsSeed = rows[0].cnt === 0;
        } catch (e) {
            // Table doesn't exist yet
            needsSeed = true;
        }
        if (needsSeed) {
            console.log('No user data found. Running seed script...');
            await runSeed();
            console.log('Database seeded successfully!');
        } else {
            console.log('Database already has data, skipping seed.');
        }
    } catch (err) {
        console.error('Auto-seed error:', err.message);
    }
};

// Manual seed endpoint (hit /api/seed to force re-seed)
app.get('/api/seed', async (req, res) => {
    try {
        await runSeed();
        await autoBackfillAttendance();
        res.json({ success: true, message: 'Database seeded successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await autoSeed();
  await autoBackfillAttendance();
});
