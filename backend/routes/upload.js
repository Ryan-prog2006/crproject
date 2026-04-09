const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── Upload Timetable + Subjects (CSV parsed client-side, sent as JSON) ───
router.post('/timetable', async (req, res) => {
    try {
        const userId = req.user.id;
        const { subjects, timetable } = req.body;

        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
            return res.status(400).json({ error: 'No subjects data provided' });
        }
        if (!timetable || !Array.isArray(timetable) || timetable.length === 0) {
            return res.status(400).json({ error: 'No timetable data provided' });
        }

        // Start transaction
        const conn = await db.getConnection();
        await conn.beginTransaction();

        try {
            // Clear existing data for this user
            await conn.query('DELETE FROM attendance_log WHERE user_id = ?', [userId]);
            await conn.query('DELETE FROM timetable WHERE user_id = ?', [userId]);
            await conn.query('DELETE FROM subjects WHERE user_id = ?', [userId]);

            // Insert subjects
            for (const sub of subjects) {
                await conn.query(
                    'INSERT INTO subjects (user_id, code, name, faculty, total_required_classes, completed_classes, color_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [userId, sub.code, sub.name, sub.faculty, sub.total_required_classes || 30, sub.completed_classes || 0, sub.color_code || '#3498db']
                );
            }

            // Insert timetable slots
            for (const slot of timetable) {
                // Look up room_id from room_name
                let roomId = null;
                if (slot.room_name) {
                    const [rooms] = await conn.query('SELECT id FROM classrooms WHERE room_name = ?', [slot.room_name]);
                    if (rooms.length > 0) roomId = rooms[0].id;
                }

                await conn.query(
                    'INSERT INTO timetable (user_id, day, period_no, time_from, time_to, subject_code, room_id, batch, is_lab, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        userId,
                        slot.day,
                        slot.period_no,
                        slot.time_from || null,
                        slot.time_to || null,
                        slot.subject_code || null,
                        roomId,
                        slot.batch || 'ALL',
                        slot.is_lab ? 1 : 0,
                        slot.notes || null
                    ]
                );
            }

            await conn.commit();
            conn.release();

            res.json({
                success: true,
                message: `Uploaded ${subjects.length} subjects and ${timetable.length} timetable slots successfully!`
            });
        } catch (innerErr) {
            await conn.rollback();
            conn.release();
            throw innerErr;
        }
    } catch (error) {
        console.error('Timetable upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── Upload Classrooms (CSV parsed client-side, sent as JSON) ───
router.post('/classrooms', async (req, res) => {
    try {
        // Only admin or CR can upload classrooms
        if (req.user.role !== 'admin' && req.user.role !== 'cr') {
            return res.status(403).json({ error: 'Only admin or CR can upload classrooms' });
        }

        const { classrooms } = req.body;
        if (!classrooms || !Array.isArray(classrooms) || classrooms.length === 0) {
            return res.status(400).json({ error: 'No classroom data provided' });
        }

        let inserted = 0;
        let skipped = 0;

        for (const room of classrooms) {
            if (!room.room_name) {
                skipped++;
                continue;
            }
            try {
                await db.query(
                    'INSERT IGNORE INTO classrooms (room_name, floor, capacity) VALUES (?, ?, ?)',
                    [room.room_name, room.floor || 'Unknown', room.capacity || 60]
                );
                // Check if row was actually inserted (vs skipped due to duplicate)
                const [result] = await db.query('SELECT ROW_COUNT() as cnt');
                if (result[0].cnt > 0) inserted++;
                else skipped++;
            } catch (err) {
                skipped++;
            }
        }

        res.json({
            success: true,
            message: `Inserted ${inserted} classrooms, skipped ${skipped} (duplicates or invalid).`
        });
    } catch (error) {
        console.error('Classrooms upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ─── Semester Reset (Admin only) ───
router.post('/reset/:userId', async (req, res) => {
    try {
        // Only admin can reset
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admin can reset CR data' });
        }

        const targetUserId = req.params.userId;

        // Verify target user is a CR
        const [users] = await db.query('SELECT * FROM users WHERE id = ? AND role = "cr"', [targetUserId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'CR user not found' });
        }

        const conn = await db.getConnection();
        await conn.beginTransaction();

        try {
            // Delete in correct order (foreign key constraints)
            await conn.query('DELETE FROM attendance_log WHERE user_id = ?', [targetUserId]);
            await conn.query('DELETE FROM timetable WHERE user_id = ?', [targetUserId]);
            await conn.query('DELETE FROM subjects WHERE user_id = ?', [targetUserId]);

            await conn.commit();
            conn.release();

            res.json({
                success: true,
                message: `All data for ${users[0].name} has been reset successfully.`
            });
        } catch (innerErr) {
            await conn.rollback();
            conn.release();
            throw innerErr;
        }
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
