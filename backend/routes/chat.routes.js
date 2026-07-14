import express from 'express';
import { generateChatResponse, getMessages, getAllSessions, renameSession, deleteSession } from '../controllers/chat.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// Fetch all session titles
router.get('/sessions', protectRoute, getAllSessions);

// Pass the sessionId in the URL to fetch chat history
router.get('/history/:sessionId', protectRoute, getMessages);

// Generate a new chat response
router.post('/generate', protectRoute, generateChatResponse);

// NEW ROUTE: Update (rename) a session's title
router.put('/sessions/:id', protectRoute, renameSession);

// NEW ROUTE: Delete a session
router.delete('/sessions/:id', protectRoute, deleteSession);

export default router;