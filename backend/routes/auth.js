const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

  try {
    const [rows] = await db.query(
      'SELECT id, name, role FROM users WHERE username = ? AND password = ?',
      [username, hashedPassword]
    );

    if (rows.length > 0) {
      const user = rows[0];
      // In a real app, use JWT. Here we return role & name as requested.
      res.json({
        success: true,
        token: 'mock-session-token-' + user.id,
        role: user.role,
        name: user.name
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
