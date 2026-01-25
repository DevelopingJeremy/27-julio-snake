
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

export const login = async (req, res) => {
    const { characterId, code } = req.body;

    try {
        const [rows] = await pool.query('SELECT * FROM users_snake WHERE id = ?', [characterId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Character not found' });
        }

        const user = rows[0];

        // Restrict access to specific characters: Cyber Blue (2) and Electric Gold (3)
        const allowedIds = [2, 3];
        if (!allowedIds.includes(user.id)) {
            return res.status(403).json({ message: 'Pin incorrecto' }); // Masking permission error as pin error per user request
        }

        // Check code if user requires one
        if (user.code && user.code !== code) {
            return res.status(401).json({ message: 'Pin incorrecto' });
        }

        // Generate Token
        // Use a simple secret key for now (in prod should be in env)
        const secret = process.env.JWT_SECRET || 'secret_snake_key_2707';
        
        const token = jwt.sign(
            { id: user.id, name: user.name, color: user.color },
            secret,
            { expiresIn: '24h' }
        );

        // Set Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Set to true if using HTTPS in prod
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        return res.json({ 
            message: 'Login successful', 
            token, // Return token for client-side storage (SessionStorage)
            user: { id: user.id, name: user.name, color: user.color } 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const logout = (req, res) => {
    res.clearCookie('token');
    return res.json({ message: 'Logged out' });
};
