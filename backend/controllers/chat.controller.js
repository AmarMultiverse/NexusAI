import Groq from "groq-sdk";
import Message from '../models/message.model.js';
import ChatSession from '../models/session.model.js';

// 1. Fetch all sessions for the sidebar
export const getAllSessions = async (req, res) => {
    try {
        const sessions = await ChatSession.find({ userId: req.user._id }).sort({ updatedAt: -1 });
        res.status(200).json(sessions);
    } catch (error) {
        console.error("Session Error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// 2. Fetch previous chat messages for a specific session
export const getMessages = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const messages = await Message.find({ senderId: req.user._id, sessionId });
        res.status(200).json(messages);
    } catch (error) {
        console.error("Get Messages Error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 3. Generate chat response (Supports Automatic Model Fallback + Guest & Auth Modes)
export const generateChatResponse = async (req, res) => {
    try {
        const { prompt, sessionId, aiModel, guestHistory } = req.body; 
        const userId = req.user?._id || null;

        if (!prompt) {
            return res.status(400).json({ message: "Prompt cannot be empty!" });
        }

        let currentSessionId = sessionId;
        let formattedMessages = [];

        // CASE A: Authenticated User -> Save & load context from MongoDB
        if (userId) {
            if (!currentSessionId) {
                const newSession = await ChatSession.create({
                    userId,
                    title: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '') 
                });
                currentSessionId = newSession._id;
            }

            await Message.create({
                senderId: userId,
                sessionId: currentSessionId,
                text: prompt,
                role: "user"
            });

            const chatHistory = await Message.find({ sessionId: currentSessionId }).sort({ createdAt: 1 });
            formattedMessages = chatHistory.map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user', 
                content: msg.text
            }));
        } 
        // CASE B: Guest User (Recruiter Mode) -> Use temporary client-side history
        else {
            if (Array.isArray(guestHistory) && guestHistory.length > 0) {
                formattedMessages = guestHistory
                    .filter(msg => msg.text && msg.text.trim() !== '')
                    .map(msg => ({
                        role: msg.sender === 'ai' ? 'assistant' : 'user',
                        content: msg.text
                    }));
            }
            formattedMessages.push({ role: 'user', content: prompt });
        }

        // System prompt for NexusAI persona
        const systemPrompt = {
            role: "system",
            content: "You are NexusAI, an expert AI software engineer created by Amar. Provide direct, accurate code and answers without unnecessary greetings. Always prioritize fulfilling the user's specific request."
        };

        // Set SSE Streaming Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        if (userId && currentSessionId) {
            res.write(`data: ${JSON.stringify({ sessionId: currentSessionId })}\n\n`);
        }

        // Build Resilient Model Fallback Queue from .env and active Groq Production Models
        const primaryEnvModel = process.env.PRIMARY_AI_MODEL || "openai/gpt-oss-120b";
        const fallbackEnvModels = process.env.FALLBACK_AI_MODELS
            ? process.env.FALLBACK_AI_MODELS.split(',').map(m => m.trim())
            : ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

        // Unique ordered list: User Selected Model -> Primary .env Model -> Fallback .env Models
        const modelQueue = [...new Set([
            aiModel,
            primaryEnvModel,
            ...fallbackEnvModels,
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b"
        ].filter(Boolean))];

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        let stream = null;
        let activeModelUsed = null;
        let lastError = null;

        // Try models in sequence until one succeeds
        for (const candidateModel of modelQueue) {
            try {
                stream = await groq.chat.completions.create({
                    messages: [systemPrompt, ...formattedMessages],
                    model: candidateModel,
                    stream: true,
                });
                activeModelUsed = candidateModel;
                break; // Successfully connected to a model!
            } catch (err) {
                console.warn(`Model [${candidateModel}] failed (${err.message}). Trying next fallback model...`);
                lastError = err;
            }
        }

        if (!stream) {
            throw new Error(lastError?.message || "All configured AI models failed to respond.");
        }

        let aiFullResponse = "";
        for await (const chunk of stream) {
            const chunkText = chunk.choices[0]?.delta?.content || "";
            if (chunkText) {
                aiFullResponse += chunkText;
                res.write(`data: ${JSON.stringify({ text: chunkText, modelUsed: activeModelUsed })}\n\n`);
            }
        }

        // Save AI response to MongoDB only if user is logged in
        if (userId && currentSessionId && aiFullResponse.trim() !== "") {
            await Message.create({
                senderId: userId,
                sessionId: currentSessionId,
                text: aiFullResponse,
                role: "ai"
            });
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error("Chat Error:", error.message);
        res.write(`data: ${JSON.stringify({ error: `AI Service Error: ${error.message}` })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
};

// 4. Rename Chat Session
export const renameSession = async (req, res) => {
    try {
        const { title } = req.body;
        
        if (!title) {
            return res.status(400).json({ message: "Title cannot be empty!" });
        }

        const updatedSession = await ChatSession.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id }, 
            { title: title },
            { new: true }
        );

        if (!updatedSession) {
            return res.status(404).json({ message: "Chat session not found in the database!" });
        }

        res.status(200).json({ message: "Title updated successfully" });
    } catch (error) {
        console.error("Rename Error:", error.message);
        res.status(500).json({ message: "Server error during renaming" });
    }
};

// 5. Delete Chat Session
export const deleteSession = async (req, res) => {
    try {
        const sessionId = req.params.id;
        const userId = req.user._id;

        await Message.deleteMany({ sessionId: sessionId, senderId: userId });
        const deletedSession = await ChatSession.findOneAndDelete({ _id: sessionId, userId: userId });

        if (!deletedSession) {
            return res.status(404).json({ message: "Chat session not found!" });
        }

        res.status(200).json({ message: "Chat deleted successfully" });
    } catch (error) {
        console.error("Delete Error:", error.message);
        res.status(500).json({ message: "Server error during deletion" });
    }
};