import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Strict Authentication Middleware: Requires valid login token (Used for saving/renaming/deleting sessions)
export const protectRoute = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Access Denied: Authorization token missing or invalid." });
        }

        const token = authHeader.split(' ')[1];
        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({ message: "Access Denied: Invalid token format." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: "User not found in the database." });
        }

        req.user = user;
        next(); 
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        res.status(401).json({ message: "Token is invalid or has expired. Please log in again." });
    }
};

// Optional Authentication Middleware: Allows both Guests and Logged-in Users to chat
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }

        const token = authHeader.split(' ')[1];
        if (!token || token === 'null' || token === 'undefined') {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        req.user = user || null;
        next();
    } catch (error) {
        // If token is expired or invalid, proceed safely in Guest Mode
        req.user = null;
        next();
    }
};