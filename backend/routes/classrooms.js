const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all classrooms
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM classrooms');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available rooms
router.get('/available', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM classrooms WHERE status = 'available'");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single room
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM classrooms WHERE id = ?', [req.params.id]);
    if (rows.length > 0) res.json(rows[0]);
    else res.status(404).json({ message: 'Room not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update status
router.put('/:id/status', async (req, res) => {
  const { status, occupied_by } = req.body;
  try {
    await db.query(
      'UPDATE classrooms SET status = ?, occupied_by = ? WHERE id = ?',
      [status, occupied_by || null, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
