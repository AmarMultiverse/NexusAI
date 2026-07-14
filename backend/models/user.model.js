import mongoose from 'mongoose';

// Defining the User Schema (blueprint)
const userSchema = new mongoose.Schema(
    {
        name: { 
            type: String, 
            required: true // This field is required; an account cannot be created without it
        },
        email: { 
            type: String, 
            required: true, 
            unique: true // Ensures only one account can be created per email address
        },
        password: { 
            type: String, 
            required: true 
        }
    }, 
    // Automatically adds and manages 'createdAt' and 'updatedAt' fields
    { timestamps: true } 
);

// Exporting the model as 'User' based on the schema
export default mongoose.model('User', userSchema);