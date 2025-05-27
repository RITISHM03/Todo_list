//Using Express
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Debug environment variables
console.log('Starting server...');
console.log('Environment variables:', {
    MONGODB_URI: process.env.MONGODB_URI ? 'Set (hidden for security)' : 'Not set',
    PORT: process.env.PORT || 3001
});

//create an instance of express
const app = express();

// CORS configuration
app.use(cors({
    origin: '*',  // Allow all origins in development - customize this in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Add error handling middleware for JSON parsing
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'Invalid JSON' });
    }
    next();
});

//Sample in-memory storage for todo items
// let todos = [];

// MongoDB Atlas connection URL with fallback
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables');
    throw new Error('MONGODB_URI is not defined');
}

// MongoDB connection options
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    maxPoolSize: 10,
    retryWrites: true
};

// Function to connect to MongoDB
const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(MONGODB_URI, mongooseOptions);
        console.log('Successfully connected to MongoDB Atlas');
    } catch (err) {
        console.error('MongoDB Connection Error:', {
            name: err.name,
            message: err.message,
            code: err.code
        });
        // In production, we want to keep trying to connect
        if (process.env.NODE_ENV === 'production') {
            console.log('Retrying connection in 5 seconds...');
            setTimeout(connectDB, 5000);
        } else {
            throw err;
        }
    }
};

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('MongoDB connection established');
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB connection disconnected');
    if (process.env.NODE_ENV === 'production') {
        console.log('Attempting to reconnect to MongoDB...');
        setTimeout(connectDB, 5000);
    }
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    if (process.env.NODE_ENV === 'production') {
        console.log('Attempting to reconnect to MongoDB...');
        setTimeout(connectDB, 5000);
    }
});

// Initial connection
connectDB().catch(console.error);

//creating schema
const todoSchema = new mongoose.Schema({
    title: {
        required: true,
        type: String
    },
    description: String
}, {
    timestamps: true
});

//creating model
const todoModel = mongoose.model('Todo', todoSchema);

// Health check endpoint with detailed status
app.get('/', (req, res) => {
    res.json({ 
        status: 'healthy',
        message: 'Server is running',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

//Create a new todo item
app.post('/todos', async (req, res) => {
    try {
        const {title, description} = req.body;
        
        if (!title || typeof title !== 'string') {
            return res.status(400).json({ message: "Title is required and must be a string" });
        }
        
        const newTodo = new todoModel({
            title: title.trim(),
            description: description ? description.trim() : ''
        });
        
        const savedTodo = await newTodo.save();
        console.log('Created todo:', savedTodo);
        res.status(201).json(savedTodo);
    } catch (error) {
        console.error('Error creating todo:', error);
        res.status(500).json({message: "Internal server error"});
    }
});

//Get all items
app.get('/todos', async (req, res) => {
    try {
        const todos = await todoModel.find().sort({ createdAt: -1 });
        res.json(todos);
    } catch (error) {
        console.error('Error fetching todos:', error);
        res.status(500).json({message: "Internal server error"});
    }
});

// Update a todo item
app.put("/todos/:id", async (req, res) => {
    try {
        const {title, description} = req.body;
        const id = req.params.id;
        
        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }

        const updatedTodo = await todoModel.findByIdAndUpdate(
            id,
            { title, description },
            { new: true }
        );
    
        if (!updatedTodo) {
            return res.status(404).json({ message: "Todo not found" });
        }
        res.json(updatedTodo);
    } catch (error) {
        console.error('Error updating todo:', error);
        res.status(500).json({message: "Internal server error"});
    }
});

// Delete a todo item
app.delete('/todos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const deletedTodo = await todoModel.findByIdAndDelete(id);
        if (!deletedTodo) {
            return res.status(404).json({ message: "Todo not found" });
        }
        res.status(204).end();    
    } catch (error) {
        console.error('Error deleting todo:', error);
        res.status(500).json({message: "Internal server error"});
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ 
        message: 'Something broke!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

//Start the server
const port = process.env.PORT || 3001;

// For Vercel, we only start the server if we're running locally
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, '0.0.0.0', () => {
        console.log("Server is listening to port " + port);
        console.log("Test the API at http://localhost:" + port);
    });
}

// Export the app for Vercel
module.exports = app;
