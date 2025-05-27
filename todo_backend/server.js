//Using Express
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Debug environment variables
console.log('Environment variables:', {
    MONGODB_URI: process.env.MONGODB_URI,
    PORT: process.env.PORT
});

//create an instance of express
const app = express();

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL,
        'https://*.vercel.app'  // Allow all Vercel deployments
    ],
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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ritishm07:ritishrockz@todolist.j7ghe.mongodb.net/todo-app?retryWrites=true&w=majority';

console.log('Attempting to connect to MongoDB with URI:', MONGODB_URI);

// connecting mongodb with error handling
mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('Successfully connected to MongoDB Atlas.');
})
.catch((err) => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
});

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
app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
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
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!' });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

//Start the server
const port = process.env.PORT || 3001;
const server = app.listen(port, '0.0.0.0', () => {
    console.log("Server is listening to port " + port);
    console.log("Test the API at http://localhost:" + port);
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please try a different port or close the application using this port.`);
        process.exit(1);
    } else {
        console.error('Server error:', error);
        process.exit(1);
    }
});

// Handle process termination
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server terminated');
        mongoose.connection.close();
    });
});

process.on('SIGINT', () => {
    server.close(() => {
        console.log('Server terminated');
        mongoose.connection.close();
    });
});
