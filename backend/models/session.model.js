import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'New Chat' // The default title is initially set to 'New Chat', which can be updated later based on the prompt
    }
}, { timestamps: true });

const ChatSession = mongoose.model('ChatSession', sessionSchema);
export default ChatSession;