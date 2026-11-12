import express from 'express';
import { registerUser, loginUser, verifyEmailOtp } from '../controllers/auth.controller.js';

const router = express.Router();

// Register user and send OTP
router.post('/register', registerUser);

// Verify 6-digit email OTP
router.post('/verify-otp', verifyEmailOtp);

// Login user
router.post('/login', loginUser);

export default router;