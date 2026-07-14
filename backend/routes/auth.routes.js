import express from 'express';

// Importing the authentication controllers
// import { registerUser } from '../controllers/auth.controller.js'; 

// Import loginUser along with registerUser
import { registerUser, loginUser } from '../controllers/auth.controller.js';

const router = express.Router();

// Handle POST requests to '/register' from the frontend
// and direct them to the 'registerUser' controller function.
router.post('/register', registerUser);

// New route for user login
router.post('/login', loginUser);

// Export the router so it can be used by the main server application
export default router;