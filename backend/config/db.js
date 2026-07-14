// Importing Mongoose (Our MongoDB object modeling tool)
import mongoose from 'mongoose';

// This is an asynchronous function because connecting to the database takes some time.
// We use 'await' to pause execution until the connection is established.
const connectDB = async () => {
    try {
        // Fetching the secure database connection string from the .env file
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        // If successful, log a confirmation message to the terminal
        console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    } catch (error) {
        // If the connection fails, log the error and terminate the server process (process.exit(1))
        console.error(`❌ Database Connection Error: ${error.message}`);
        process.exit(1);
    }
};

// Exporting this function so it can be initialized in the main server file (index.js)
export default connectDB;