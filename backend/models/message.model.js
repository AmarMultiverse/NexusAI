import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // NEW FIELD: Each message is now associated with a specific chat session
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatSession',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'ai'],
        required: true
    }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
export default Message;