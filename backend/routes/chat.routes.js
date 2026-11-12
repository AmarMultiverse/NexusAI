import express from 'express';
import { generateChatResponse, getMessages, getAllSessions, renameSession, deleteSession, syncGuestChat } from '../controllers/chat.controller.js';
import { protectRoute, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Fetch all session titles (Requires Login)
router.get('/sessions', protectRoute, getAllSessions);

// Fetch chat history for a specific session (Requires Login)
router.get('/history/:sessionId', protectRoute, getMessages);

// Sync Guest Mode messages to MongoDB upon Login/Signup (Requires Login)
router.post('/sync-guest', protectRoute, syncGuestChat);

// Generate a new chat response (Supports both Guest Mode and Logged-in Mode)
router.post('/generate', optionalAuth, generateChatResponse);

// Rename a session's title (Requires Login)
router.put('/sessions/:id', protectRoute, renameSession);

// Delete a session (Requires Login)
router.delete('/sessions/:id', protectRoute, deleteSession);

export default router;