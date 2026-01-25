import { createServer } from 'http';
import dotenv from 'dotenv/config';
import express from 'express';
import { Server } from 'socket.io';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import requestIp from 'request-ip';
import jwt from 'jsonwebtoken';
import { pool } from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET;

app.use(express.json());
app.use(cookieParser());
app.use(requestIp.mw()); 
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// Static files for uploads
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { verifyToken } from './src/middlewares/auth.middleware.js';

app.use('/uploads', verifyToken, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', authRoutes);
app.use('/api', uploadRoutes);

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true
    },
});

// Socket Middleware for Auth
io.use((socket, next) => {
    let token = socket.handshake.auth?.token;

    if (!token) {
        const cookieString = socket.handshake.headers.cookie;
        if (cookieString) {
            const getCookie = (name) => {
                const value = `; ${cookieString}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop().split(';').shift();
            };
            token = getCookie('token');
        }
    }
    
    if (!token) return next(new Error('Authentication error'));

    try {
        const decoded = jwt.verify(token, SECRET);
        socket.user = decoded; 
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.id})`);
    
    // Send current user info to client
    socket.emit('session', socket.user);

    socket.on('getHistory', async ({ cursor } = {}) => {
        try {
            // Complex query to get message details + sender info + reply parent info + reply sender info
            let query = `
                SELECT 
                    m.id, m.message, m.type, m.created_at, m.updated_at, m.response_to,
                    u.name, u.color,
                    pm.id as reply_id, pm.message as reply_message, pm.type as reply_type, 
                    pu.name as reply_user, pu.color as reply_color
                FROM messages m 
                JOIN users u ON m.user_send = u.id 
                LEFT JOIN messages pm ON m.response_to = pm.id 
                LEFT JOIN users pu ON pm.user_send = pu.id
            `;
            let params = [];

            if (cursor) {
                query += ' WHERE m.id < ?';
                params.push(cursor);
            }

            // Get most recent messages first
            query += ' ORDER BY m.id DESC LIMIT 50';

            const [rows] = await pool.query(query, params);
            
            // Reverse back to chronological order
            const history = rows.reverse().map(row => ({
                id: row.id,
                text: row.message,
                type: row.type,
                user: row.name,
                color: row.color,
                timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: row.created_at,
                isEdited: new Date(row.updated_at).getTime() > new Date(row.created_at).getTime(),
                reply: row.reply_id ? {
                    id: row.reply_id,
                    text: row.reply_message,
                    type: row.reply_type,
                    user: row.reply_user,
                    color: row.reply_color
                } : null
            }));
            
            socket.emit('historyChunk', history);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    });

    socket.on("sendMessage", async (data) => {
        const { text, type = 'text', responseTo = null } = data;
        const userId = socket.user.id;
        
        try {
            const [result] = await pool.query(
                'INSERT INTO messages (user_send, user_receive, message, type, response_to) VALUES (?, ?, ?, ?, ?)',
                [userId, 0, text, type, responseTo]
            );
            
            const insertId = result.insertId;

            // Fetch full message details (including reply info) to emit back
            // This is slightly expensive but ensures consistency
            const [rows] = await pool.query(`
                SELECT 
                    m.id, m.message, m.type, m.created_at, m.updated_at,
                    u.name, u.color,
                    pm.id as reply_id, pm.message as reply_message, pm.type as reply_type, 
                    pu.name as reply_user, pu.color as reply_color
                FROM messages m 
                JOIN users u ON m.user_send = u.id 
                LEFT JOIN messages pm ON m.response_to = pm.id 
                LEFT JOIN users pu ON pm.user_send = pu.id
                WHERE m.id = ?
            `, [insertId]);

            if (rows.length > 0) {
                const row = rows[0];
                const messagePayload = {
                   id: row.id, 
                   text: row.message,
                   type: row.type,
                   user: row.name,
                   color: row.color,
                   timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                   createdAt: row.created_at,
                   isEdited: false,
                   reply: row.reply_id ? {
                       id: row.reply_id,
                       text: row.reply_message,
                       type: row.reply_type,
                       user: row.reply_user,
                       color: row.reply_color
                   } : null
                };
                io.emit("receiveMessage", messagePayload);
            }
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    socket.on('jumpToMessage', async ({ id }) => {
        try {
            // Fetch 25 older (inclusive) and 25 newer
            // Note: We need full join details for replies
            const baseSelect = `
                SELECT 
                    m.id, m.message, m.type, m.created_at, m.updated_at, m.response_to,
                    u.name, u.color,
                    pm.id as reply_id, pm.message as reply_message, pm.type as reply_type, 
                    pu.name as reply_user, pu.color as reply_color
                FROM messages m 
                JOIN users u ON m.user_send = u.id 
                LEFT JOIN messages pm ON m.response_to = pm.id 
                LEFT JOIN users pu ON pm.user_send = pu.id
            `;

            if (!id || typeof id !== 'number') {
                 socket.emit('jumpError', { message: 'ID de mensaje inválido.' });
                 return;
            }

            const [olderRows] = await pool.query(`${baseSelect} WHERE m.id <= ? ORDER BY m.id DESC LIMIT 25`, [id]);
            const [newerRows] = await pool.query(`${baseSelect} WHERE m.id > ? ORDER BY m.id ASC LIMIT 25`, [id]);

            // Combine and sort by ID ASC (chronological)
            const allRows = [...olderRows, ...newerRows].sort((a, b) => a.id - b.id);

            const history = allRows.map(row => ({
                id: row.id,
                text: row.message,
                type: row.type,
                user: row.name,
                color: row.color,
                timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: row.created_at,
                isEdited: new Date(row.updated_at).getTime() > new Date(row.created_at).getTime(),
                reply: row.reply_id ? {
                    id: row.reply_id,
                    text: row.reply_message,
                    type: row.reply_type,
                    user: row.reply_user,
                    color: row.reply_color
                } : null
            }));

            socket.emit('loadJumpMessages', history);

        } catch (error) {
            console.error('Error jumping to message:', error);
            socket.emit('jumpError', { message: 'Error al recuperar el historial del mensaje.' });
        }
    });

    socket.on("editMessage", async (data) => {
        const { id, text } = data;
        const userId = socket.user.id;

        try {
            // Check ownership and valid ID
            const [rows] = await pool.query('SELECT user_send FROM messages WHERE id = ?', [id]);
            if (rows.length === 0) return;
            if (rows[0].user_send !== userId) return;

            // Update
            await pool.query('UPDATE messages SET message = ? WHERE id = ?', [text, id]);

            io.emit("messageUpdated", { id, text, isEdited: true });
        } catch (err) {
            console.error('Error editing message:', err);
        }
    });

    socket.on("deleteMessage", async (data) => {
        const { id } = data;
        const userId = socket.user.id;

        try {
             // Check ownership
            const [rows] = await pool.query('SELECT user_send FROM messages WHERE id = ?', [id]);
            if (rows.length === 0) return;
            if (rows[0].user_send !== userId) return;

            // Hard delete
            await pool.query('DELETE FROM messages WHERE id = ?', [id]);
            
            // Also nullify references to this message to avoid broken UI in replies?
            // Actually, if we use foreign keys it might error. If not, it just returns null for join.
            // Left join keeps main message, reply columns become null. Works fine.
            
            io.emit("messageDeleted", { id });
        } catch (err) {
            console.error('Error deleting message:', err);
        }
    });

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});