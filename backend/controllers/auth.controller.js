import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dns from 'dns';

// Helper function to validate email format, block dummy addresses, and verify domain MX records
const verifyRealEmail = async (email) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // 1. Strict RFC-compliant Email Regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
        return { valid: false, reason: "Invalid email format. Please enter a valid email address." };
    }

    const [localPart, domain] = cleanEmail.split('@');

    // 2. Block common disposable/fake domains and obvious placeholder usernames
    const blockedDomains = ['mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'yopmail.com', 'example.com', 'test.com', 'fake.com'];
    const blockedLocalParts = ['test', 'testing', 'admin', 'user', 'demo', 'abc', 'xyz', 'fake', '123', '1234', 'qwerty', 'asdf'];

    if (blockedDomains.includes(domain)) {
        return { valid: false, reason: "Disposable or temporary email addresses are not permitted." };
    }

    if (blockedLocalParts.includes(localPart) || localPart.length < 3) {
        return { valid: false, reason: "Please use your genuine personal or work email address." };
    }

    // 3. DNS MX Record Lookup: Verify that the email domain actually has active mail servers
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

// Logic for User Registration
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." });
        }

        // Verify email authenticity and domain mail servers
        const emailCheck = await verifyRealEmail(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ message: emailCheck.reason });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: "This email is already registered." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });
        await newUser.save();

        res.status(201).json({
            message: "User successfully registered! You can now sign in.",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error("Registration Error:", error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

// Logic for User Login
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