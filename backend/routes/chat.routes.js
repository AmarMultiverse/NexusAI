import express from 'express';
import { generateChatResponse, getMessages, getAllSessions, renameSession, deleteSession } from '../controllers/chat.controller.js';
import { protectRoute, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Fetch all session titles (Requires Login)
router.get('/sessions', protectRoute, getAllSessions);

// Pass the sessionId in the URL to fetch chat history (Requires Login)
router.get('/history/:sessionId', protectRoute, getMessages);

// Generate a new chat response (Supports both Guest Mode and Logged-in Mode)
router.post('/generate', optionalAuth, generateChatResponse);

// Update (rename) a session's title (Requires Login)
router.put('/sessions/:id', protectRoute, renameSession);

// Delete a session (Requires Login)
router.delete('/sessions/:id', protectRoute, deleteSession);

export default router;