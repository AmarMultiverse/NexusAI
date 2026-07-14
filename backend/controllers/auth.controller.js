import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Logic for User Registration
export const registerUser = async (req, res) => {
    try {
        // 1. Extract the data sent by the user from the frontend
        const { name, email, password } = req.body;

        // 2. Check if any required field is missing
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // 3. Check if an account with this email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "This email is already registered." });
        }

        // 4. Encrypt (hash) the password
        const salt = await bcrypt.genSalt(10); // Salt increases the complexity of the password
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Save the new user to the database (with the hashed password)
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });
        await newUser.save(); // Data is successfully saved to MongoDB!

        // 6. Send a success message (without exposing the password)
        res.status(201).json({
            message: "User successfully registered!",
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

        // 1. Check if both email and password are provided
        if (!email || !password) {
            return res.status(400).json({ message: "Both email and password are required." });
        }

        // 2. Search the database to see if a user exists with this email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "No account found with this email." });
        }

        // 3. Verify the password (compare the user's input with the hashed password in the database)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password, please try again." });
        }

        // 4. If credentials are correct, generate a JWT Token (Authorization Pass)
        // This token will be valid for 7 days, after which the user will need to log in again
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // 5. Send back the success message along with the token
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