const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all attendance logs
router.get('/', async (req, res) => {
  try {
    const userFilter = req.user.role === 'cr' ? `WHERE a.user_id = ${db.escape(req.user.id)}` : '';
    const [rows] = await db.query(
      'SELECT a.*, s.name as subject_name FROM attendance_log a ' +
      'JOIN subjects s ON a.subject_code = s.code AND a.user_id = s.user_id ' +
      `${userFilter} ORDER BY date DESC, period_no DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logs for specific date
router.get('/date/:date', async (req, res) => {
  try {
    const userFilter = req.user.role === 'cr' ? `AND a.user_id = ${db.escape(req.user.id)}` : '';
    const [rows] = await db.query(
      'SELECT a.*, s.name as subject_name FROM attendance_log a ' +
      'JOIN subjects s ON a.subject_code = s.code AND a.user_id = s.user_id ' +
      `WHERE a.date = ? ${userFilter} ORDER BY period_no`,
      [req.params.date]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create attendance log
router.post('/', async (req, res) => {
  const { subject_code, timetable_id, date, period_no, status, notes } = req.body;
  try {
    const userId = req.user.role === 'cr' ? req.user.id : (req.body.user_id || 2);
    await db.query(
      'INSERT INTO attendance_log (user_id, subject_code, timetable_id, date, period_no, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, subject_code, timetable_id, date, period_no, status, notes]
    );
    // Increment completed_classes if status is 'conducted' or 'extra'
    if (status !== 'cancelled') {
        await db.query('UPDATE subjects SET completed_classes = completed_classes + 1 WHERE code = ? AND user_id = ?', [subject_code, userId]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit attendance log
router.put('/:id', async (req, res) => {
  const { status, notes } = req.body;
  try {
    const userFilter = req.user.role === 'cr' ? `AND user_id = ${db.escape(req.user.id)}` : '';
    const [oldRow] = await db.query(`SELECT status, subject_code, user_id FROM attendance_log WHERE id = ? ${userFilter}`, [req.params.id]);
    if (oldRow.length > 0) {
        const oldStatus = oldRow[0].status;
        const subjectCode = oldRow[0].subject_code;
        const recordUserId = oldRow[0].user_id;

        await db.query('UPDATE attendance_log SET status = ?, notes = ? WHERE id = ?', [status, notes, req.params.id]);

        // Adjust completed_classes
        if (oldStatus === 'cancelled' && (status === 'conducted' || status === 'extra')) {
            await db.query('UPDATE subjects SET completed_classes = completed_classes + 1 WHERE code = ? AND user_id = ?', [subjectCode, recordUserId]);
        } else if ((oldStatus === 'conducted' || oldStatus === 'extra') && status === 'cancelled') {
            await db.query('UPDATE subjects SET completed_classes = completed_classes - 1 WHERE code = ? AND user_id = ?', [subjectCode, recordUserId]);
        }
        res.json({ success: true });
    } else {
        res.status(404).json({ message: 'Log not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats
router.get('/stats', async (req, res) => {
  try {
    const userFilter = req.user.role === 'cr' ? `WHERE user_id = ${db.escape(req.user.id)}` : '';
    const [rows] = await db.query(
      'SELECT subject_code, ' +
      'SUM(CASE WHEN status = "conducted" THEN 1 ELSE 0 END) as conducted, ' +
      'SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled, ' +
      'SUM(CASE WHEN status = "extra" THEN 1 ELSE 0 END) as extra ' +
      `FROM attendance_log ${userFilter} GROUP BY subject_code`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
