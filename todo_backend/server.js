//Using Express
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Debug environment variables
console.log('Starting server...');
console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI ? 'Set (hidden)' : 'Not set',
    PORT: process.env.PORT || 3001
});

//create an instance of express
const app = express();

// CORS configuration
app.use(cors({
    origin: '*',  // Allow all origins for Vercel deployment
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

// MongoDB Atlas connection URL
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ritishm07:ritishrockz@todolist.j7ghe.mongodb.net/todo-app?retryWrites=true&w=majority';

let cachedDb = null;

// Function to connect to MongoDB
async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    
    try {
        const db = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        cachedDb = db;
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

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

// Health check endpoint
app.get('/', async (req, res) => {
    try {
        await connectToDatabase();
        res.json({ message: 'Server is running', status: 'connected' });
    } catch (error) {
        res.status(500).json({ message: 'Database connection error', error: error.message });
    }
});

//Create a new todo item
app.post('/todos', async (req, res) => {
    try {
        await connectToDatabase();
        const {title, description} = req.body;
        
        if (!title || typeof title !== 'string') {
            return res.status(400).json({ message: "Title is required and must be a string" });
        }
        
        const newTodo = new todoModel({
            title: title.trim(),
            description: description ? description.trim() : ''
        });
        
        const savedTodo = await newTodo.save();
        res.status(201).json(savedTodo);
    } catch (error) {
        console.error('Error creating todo:', error);
        res.status(500).json({message: "Internal server error"});
    }
});

//Get all items
app.get('/todos', async (req, res) => {
    try {
        await connectToDatabase();
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
        await connectToDatabase();
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
        await connectToDatabase();
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

// Only start the server if we're not in a Vercel environment
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
        console.log("Server is listening to port " + port);
        console.log("Test the API at http://localhost:" + port);
    });
}

// Export the app for Vercel
module.exports = app;
