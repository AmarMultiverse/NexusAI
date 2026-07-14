import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Authentication Middleware: Protects routes from unauthorized access
export const protectRoute = async (req, res, next) => {
    try {
        // 1. Check if the frontend sent a 'Bearer Token' in the authorization headers
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Access Denied: Authorization token missing or invalid." });
        }

        // 2. Extract the token from the header (remove the 'Bearer ' prefix)
        const token = authHeader.split(' ')[1];

        // 3. Verify the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Find the user in the database using the decoded ID (exclude the password field)
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: "User not found in the database." });
        }

        // 5. Attach the user object to the request (req) so the next controller can access it
        req.user = user;
        
        // 6. Authentication successful, proceed to the next middleware/controller
        next(); 

    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        res.status(401).json({ message: "Token is invalid or has expired. Please log in again." });
    }
};