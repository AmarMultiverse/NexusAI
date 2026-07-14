import Groq from "groq-sdk";
import Message from '../models/message.model.js';
import ChatSession from '../models/session.model.js'; // Imported new Session Model



// 1. Fetch all sessions for the sidebar
export const getAllSessions = async (req, res) => {
    try {
        // Find all sessions for the user and sort them by the most recently updated (descending order)
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
        const { sessionId } = req.params; // Retrieve the specific session ID from the URL parameters
        const messages = await Message.find({ senderId: req.user._id, sessionId });
        res.status(200).json(messages);
    } catch (error) {
        console.error("Get Messages Error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 3. Generate and save a new chat response
export const generateChatResponse = async (req, res) => {
    try {
        const { prompt, sessionId, aiModel } = req.body; 
        const userId = req.user._id;

        if (!prompt) return res.status(400).json({ message: "Prompt cannot be empty!" });

        let currentSessionId = sessionId;

        // 1. If it's a new chat, create a new session
        if (!currentSessionId) {
            const newSession = await ChatSession.create({
                userId,
                title: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '') 
            });
            currentSessionId = newSession._id;
        }

        // 2. Save the user's new message to the database
        await Message.create({
            senderId: userId,
            sessionId: currentSessionId,
            text: prompt,
            role: "user"
        });

        // 🧠 3. NEW LOGIC: Fetch AI Memory (Chat History)
        // Retrieve all previous messages for this session from the database to provide context to the AI
        const chatHistory = await Message.find({ sessionId: currentSessionId }).sort({ createdAt: 1 });
        
        // Format previous messages into 'user' and 'assistant' roles as required by the Groq API
        const formattedMessages = chatHistory.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user', 
            content: msg.text
        }));

        // 4. Set a smart and direct system prompt
        const systemPrompt = {
            role: "system",
            content: "You are NexusAI, an expert AI software engineer created by Amar. Provide direct, accurate code and answers without unnecessary greetings. Always prioritize fulfilling the user's specific request."
        };

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        res.write(`data: ${JSON.stringify({ sessionId: currentSessionId })}\n\n`);

        // 5. Send both memory and the new message to the API
        const stream = await groq.chat.completions.create({
            messages: [
                systemPrompt,
                ...formattedMessages // Send the entire history using the spread operator
            ],
            model: aiModel || "llama-3.3-70b-versatile",
            stream: true,
        });

        let aiFullResponse = "";
        for await (const chunk of stream) {
            const chunkText = chunk.choices[0]?.delta?.content || "";
            if (chunkText) {
                aiFullResponse += chunkText;
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }
        }

        // 6. Save the AI's final message
        await Message.create({
            senderId: userId,
            sessionId: currentSessionId,
            text: aiFullResponse,
            role: "ai"
        });

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error("Chat Error:", error.message);
        res.write(`data: ${JSON.stringify({ error: "Something went wrong with the AI processing." })}\n\n`);
        res.end();
    }
};

// --- NEW FUNCTION: Rename Chat Session ---
export const renameSession = async (req, res) => {
    try {
        const { title } = req.body;
        
        if (!title) {
            return res.status(400).json({ message: "Title cannot be empty!" });
        }

        // Find in the database and update
        const updatedSession = await ChatSession.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id }, 
            { title: title },
            { new: true } // Return the newly updated document
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

// --- NEW FUNCTION: Delete Chat Session ---
export const deleteSession = async (req, res) => {
    try {
        const sessionId = req.params.id;
        const userId = req.user._id;

        // 1. Cascading Delete: First, delete all messages associated with this session
        await Message.deleteMany({ sessionId: sessionId, senderId: userId });

        // 2. Then, delete the session itself from the database
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