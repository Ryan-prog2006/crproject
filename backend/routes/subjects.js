const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const userFilter = req.user.role === 'cr' ? `WHERE user_id = ${db.escape(req.user.id)}` : '';
    const [rows] = await db.query(
      `SELECT *, ROUND((completed_classes / total_required_classes) * 100) as percent FROM subjects ${userFilter}`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Increment completed classes
router.put('/:id/increment', async (req, res) => {
  try {
    const ensureOwnership = req.user.role === 'cr' ? ` AND user_id = ${db.escape(req.user.id)}` : '';
    await db.query(`UPDATE subjects SET completed_classes = completed_classes + 1 WHERE id = ?${ensureOwnership}`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Decrement completed classes
router.put('/:id/decrement', async (req, res) => {
  try {
    const ensureOwnership = req.user.role === 'cr' ? ` AND user_id = ${db.escape(req.user.id)}` : '';
    await db.query(`UPDATE subjects SET completed_classes = GREATEST(0, completed_classes - 1) WHERE id = ?${ensureOwnership}`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update total required classes
router.put('/:id', async (req, res) => {
  const { total_required_classes } = req.body;
  try {
    const ensureOwnership = req.user.role === 'cr' ? ` AND user_id = ${db.escape(req.user.id)}` : '';
    await db.query(`UPDATE subjects SET total_required_classes = ? WHERE id = ?${ensureOwnership}`, [total_required_classes, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
