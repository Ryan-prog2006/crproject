const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/summary', async (req, res) => {
  try {
    const [[{ total_classrooms }]] = await db.query('SELECT COUNT(*) as total_classrooms FROM classrooms');
    const [[{ available_classrooms }]] = await db.query('SELECT COUNT(*) as available_classrooms FROM classrooms WHERE status = "available"');
    const occupied_classrooms = total_classrooms - available_classrooms;

    const userFilter = req.user.role === 'cr' ? `WHERE user_id = ${db.escape(req.user.id)}` : '';
    
    const [subjects] = await db.query(
      `SELECT code, name, completed_classes as completed, (total_required_classes - completed_classes) as pending, ` +
      `ROUND((completed_classes / total_required_classes) * 100) as percent FROM subjects ${userFilter}`
    );

    const [[{ total_completed }]] = await db.query(`SELECT SUM(completed_classes) as total_completed FROM subjects ${userFilter}`);
    const [[{ total_required }]] = await db.query(`SELECT SUM(total_required_classes) as total_required FROM subjects ${userFilter}`);
    const overall_progress_percent = total_required > 0 ? Math.round((total_completed / total_required) * 100) : 0;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dateObj = new Date();
    const today = days[dateObj.getDay()];
    const todayDate = dateObj.toISOString().split('T')[0];
    const currentTime = dateObj.toTimeString().split(' ')[0];

    const andUserFilter = req.user.role === 'cr' ? `AND t.user_id = ${db.escape(req.user.id)}` : '';

    const [today_schedule] = await db.query(
        'SELECT t.*, s.name as subject_name, s.color_code, c.room_name FROM timetable t ' +
        'LEFT JOIN subjects s ON t.subject_code = s.code ' +
        'LEFT JOIN classrooms c ON t.room_id = c.id ' +
        'WHERE t.day = ? ' +
        'AND t.id NOT IN (SELECT timetable_id FROM attendance_log WHERE date = ? AND status IN ("conducted", "extra") AND timetable_id IS NOT NULL) ' +
        'AND t.time_to > ? ' +
        andUserFilter + ' ' +
        'ORDER BY t.period_no',
        [today, todayDate, currentTime]
    );

    res.json({
        total_classrooms,
        available_classrooms,
        occupied_classrooms,
        subjects,
        today_schedule,
        overall_progress_percent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
