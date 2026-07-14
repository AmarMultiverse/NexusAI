// 1. Import necessary packages
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// NEW IMPORT: Database connection function
import connectDB from './config/db.js';
// 1. NEW IMPORT: Import application routes
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js'; // <-- NEW LINE

// 2. Configure dotenv to read environment variables (secret keys)
dotenv.config();

// 3. Initialize the Express application (This is our actual server)
const app = express();

// 4. Set the port. It uses the port from the .env file if available, otherwise defaults to 5000
const PORT = process.env.PORT || 5000;

// 5. Apply middlewares (Server helpers and security)
app.use(cors()); // Allows the frontend to connect with the backend
app.use(express.json()); // Helps the backend parse incoming JSON data from the frontend

// 2. NEW CODE: Route incoming '/api/auth' requests to the authRoutes file
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes); // <-- NEW LINE

// Connect to the database before starting the server
connectDB();

// 6. Create a basic API route (To verify the server is running properly)
// This code executes when someone visits 'http://localhost:5000/' in the browser
app.get('/', (req, res) => {
    res.send("Hello from NexusAI Backend! The server is running smoothly. 🚀");
});

// 7. Start the server and listen on the specified PORT
app.listen(PORT, () => {
    console.log(`✅ Server is running perfectly on http://localhost:${PORT}`);
});