const express = require('express');
const router = express.Router();
const db = require('../db');

function getISTDate() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5));
}

async function getClassroomsDynamic() {
    const istNow = getISTDate();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[istNow.getDay()];
    const currentTime = istNow.toTimeString().split(' ')[0]; // HH:MM:SS

    const [rows] = await db.query(`
      SELECT c.*, 
             t.id as active_timetable_id,
             u.name as occupying_user
      FROM classrooms c
      LEFT JOIN timetable t ON c.id = t.room_id 
                            AND t.day = ?
                            AND t.time_from <= ? 
                            AND t.time_to > ?
      LEFT JOIN users u ON t.user_id = u.id
    `, [todayName, currentTime, currentTime]);

    const roomMap = {};
    for (const row of rows) {
      if (!roomMap[row.id]) {
        roomMap[row.id] = {
           id: row.id,
           room_name: row.room_name,
           floor: row.floor,
           capacity: row.capacity,
           status: row.status, 
           occupied_by: row.occupied_by 
        };
      }
      
      if (row.active_timetable_id) {
         roomMap[row.id].status = 'occupied';
         roomMap[row.id].occupied_by = row.occupying_user ? (row.occupying_user + ' (Class)') : 'Class in Progress';
      }
    }
    return Object.values(roomMap);
}

// Get all classrooms
router.get('/', async (req, res) => {
  try {
    const rooms = await getClassroomsDynamic();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available rooms
router.get('/available', async (req, res) => {
  try {
    const rooms = await getClassroomsDynamic();
    res.json(rooms.filter(r => r.status === 'available'));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single room
router.get('/:id', async (req, res) => {
  try {
    const rooms = await getClassroomsDynamic();
    const room = rooms.find(r => r.id == req.params.id);
    if (room) res.json(room);
    else res.status(404).json({ message: 'Room not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update status (Manual override)
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
