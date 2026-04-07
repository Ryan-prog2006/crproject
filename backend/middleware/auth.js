const db = require('../db');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header provided' });
    }

    const token = authHeader.split(' ')[1]; // Expecting "Bearer mock-session-token-{id}"
    if (!token || !token.startsWith('mock-session-token-')) {
        return res.status(401).json({ error: 'Invalid token format' });
    }

    const userId = token.replace('mock-session-token-', '');
    if (!userId) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        req.user = users[0];
        next();
    } catch (err) {
        console.error('Auth error:', err);
        return res.status(500).json({ error: 'Authentication processing error' });
    }
};

module.exports = authenticate;
