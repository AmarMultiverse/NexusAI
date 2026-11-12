import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dns from 'dns';
import nodemailer from 'nodemailer';

// Helper function to validate email format and verify domain MX records
const verifyRealEmail = async (email) => {
    const cleanEmail = email.trim().toLowerCase();
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
        return { valid: false, reason: "Invalid email format. Please enter a valid email address." };
    }

    const [localPart, domain] = cleanEmail.split('@');

    const blockedDomains = ['mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'yopmail.com', 'example.com', 'test.com', 'fake.com'];
    if (blockedDomains.includes(domain)) {
        return { valid: false, reason: "Disposable or temporary email addresses are not permitted." };
    }

    if (localPart.length < 2) {
        return { valid: false, reason: "Please enter a valid email username." };
    }

    try {
        const mxRecords = await dns.promises.resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) {
            return { valid: false, reason: "This email domain does not have a valid mail server." };
        }
    } catch (err) {
        return { valid: false, reason: "Could not verify email domain. Please enter a real email address." };
    }

    return { valid: true };
};

// Helper function to send 6-digit OTP via Email (or return fallback if SMTP is not configured)
const sendOtpEmail = async (email, name, otp) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[OTP FALLBACK] SMTP not configured. OTP for ${email} is: ${otp}`);
        return { sentViaEmail: false };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.sendMail({
            from: `"NexusAI Security" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `${otp} is your NexusAI verification code`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
                    <h2 style="color: #3b82f6; margin-top: 0;">NexusAI Email Verification</h2>
                    <p>Hello <strong>${name}</strong>,</p>
                    <p>Use the following 6-digit verification code to complete your NexusAI account setup. This code is valid for 10 minutes:</p>
                    <div style="background: #1e293b; padding: 16px; text-align: center; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #60a5fa; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p style="font-size: 12px; color: #94a3b8;">If you did not request this code, you can safely ignore this email.</p>
                </div>
            `
        });

        return { sentViaEmail: true };
    } catch (error) {
        console.error("SMTP Email Error:", error.message);
        return { sentViaEmail: false };
    }
};

// 1. Step 1 of Registration: Validate Email, Save Unverified User & Send 6-Digit OTP
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." });
        }

        const emailCheck = await verifyRealEmail(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ message: emailCheck.reason });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ message: "This email is already registered and verified. Please sign in." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate 6-digit OTP valid for 10 minutes
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        if (existingUser && !existingUser.isVerified) {
            existingUser.name = name.trim();
            existingUser.password = hashedPassword;
            existingUser.otpCode = otp;
            existingUser.otpExpires = otpExpires;
            await existingUser.save();
        } else {
            const newUser = new User({
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                isVerified: false,
                otpCode: otp,
                otpExpires: otpExpires
            });
            await newUser.save();
        }

        const emailStatus = await sendOtpEmail(normalizedEmail, name.trim(), otp);

        res.status(200).json({
            requiresOtp: true,
            email: normalizedEmail,
            sentViaEmail: emailStatus.sentViaEmail,
            // Provided only when SMTP credentials are not configured in .env so testing never blocks
            demoOtp: emailStatus.sentViaEmail ? undefined : otp,
            message: emailStatus.sentViaEmail 
                ? `A 6-digit verification code has been sent to ${normalizedEmail}.` 
                : `Verification code generated! (SMTP not configured, use code: ${otp})`
        });

    } catch (error) {
        console.error("Registration Error:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

// 2. Step 2 of Registration: Verify 6-Digit OTP and Issue JWT Token Immediately
export const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and verification code are required." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: "Account not found. Please sign up first." });
        }

        if (!user.otpCode || user.otpCode !== otp.trim()) {
            return res.status(400).json({ message: "Invalid 6-digit verification code!" });
        }

        if (user.otpExpires && user.otpExpires < new Date()) {
            return res.status(400).json({ message: "Verification code has expired. Please register again to get a new code." });
        }

        user.isVerified = true;
        user.otpCode = null;
        user.otpExpires = null;
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: "Email verified successfully! Welcome to NexusAI.",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("OTP Verification Error:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

// 3. Logic for User Login
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Both email and password are required." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ message: "No account found with this email." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password, please try again." });
        }

        // If user registered after OTP system was introduced but hasn't verified their OTP yet
        if (user.isVerified === false && user.otpCode) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otpCode = otp;
            user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();

            const emailStatus = await sendOtpEmail(normalizedEmail, user.name, otp);

            return res.status(403).json({
                requiresOtp: true,
                email: normalizedEmail,
                sentViaEmail: emailStatus.sentViaEmail,
                demoOtp: emailStatus.sentViaEmail ? undefined : otp,
                message: emailStatus.sentViaEmail
                    ? "Your email is not verified yet. A fresh 6-digit OTP has been sent to your inbox."
                    : `Please verify your account using OTP: ${otp}`
            });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};