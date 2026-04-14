const express = require('express');
const router = express.Router();
const db = require('../db');

// Get full weekly timetable
router.get('/', async (req, res) => {
  try {
    const userFilter = req.user.role === 'cr' ? `WHERE t.user_id = ${db.escape(req.user.id)}` : '';
    const [rows] = await db.query(
      'SELECT t.*, s.name as subject_name, s.color_code, c.room_name FROM timetable t ' +
      'LEFT JOIN subjects s ON t.user_id = s.user_id AND t.subject_code = s.code ' +
      'LEFT JOIN classrooms c ON t.room_id = c.id ' +
      `${userFilter} ORDER BY t.day, t.period_no`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's schedule
router.get('/today', async (req, res) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];

  try {
    const userFilter = req.user.role === 'cr' ? `AND t.user_id = ${db.escape(req.user.id)}` : '';
    const [rows] = await db.query(
      'SELECT t.*, s.name as subject_name, s.color_code, c.room_name FROM timetable t ' +
      'LEFT JOIN subjects s ON t.user_id = s.user_id AND t.subject_code = s.code ' +
      'LEFT JOIN classrooms c ON t.room_id = c.id ' +
      `WHERE t.day = ? ${userFilter} ORDER BY t.period_no`,
      [today]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new slot
router.post('/', async (req, res) => {
  const { day, period_no, time_from, time_to, subject_code, room_id, is_lab, batch, notes } = req.body;
  try {
    const userId = req.user.role === 'cr' ? req.user.id : (req.body.user_id || 2);

    const finalSubjectCode = subject_code || null;
    const finalRoomId = room_id || null;

    if (finalSubjectCode) {
      // Remove any 'Library' placeholder for that same user/day/period so they don't overlap.
      await db.query(
        'DELETE FROM timetable WHERE user_id = ? AND day = ? AND period_no = ? AND (subject_code IS NULL OR subject_code = "")',
        [userId, day, period_no]
      );
    }

    const [result] = await db.query(
      'INSERT INTO timetable (user_id, day, period_no, time_from, time_to, subject_code, room_id, is_lab, batch, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, day, period_no, time_from, time_to, finalSubjectCode, finalRoomId, is_lab, batch, notes]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Error creating slot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Edit slot
router.put('/:id', async (req, res) => {
  const { day, period_no, time_from, time_to, subject_code, room_id, is_lab, batch, notes } = req.body;
  try {
    const ensureOwnership = req.user.role === 'cr' ? ` AND user_id = ${db.escape(req.user.id)}` : '';
    await db.query(
      `UPDATE timetable SET day=?, period_no=?, time_from=?, time_to=?, subject_code=?, room_id=?, is_lab=?, batch=?, notes=? WHERE id=?${ensureOwnership}`,
      [day, period_no, time_from, time_to, subject_code, room_id, is_lab, batch, notes, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete slot
router.delete('/:id', async (req, res) => {
  try {
    const ensureOwnership = req.user.role === 'cr' ? ` AND user_id = ${db.escape(req.user.id)}` : '';
    await db.query(`DELETE FROM timetable WHERE id = ?${ensureOwnership}`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
