//Using Express
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

//create an instance of express
const app = express();

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://todo-list-pink-one-44.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

// MongoDB Atlas connection URL
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ritishm07:ritishrockz@todolist.j7ghe.mongodb.net/todo-app?retryWrites=true&w=majority';

console.log('Attempting to connect to MongoDB...');

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

// Start server with error handling
const startServer = () => {
    const port = process.env.PORT || 3001;
    const server = app.listen(port, () => {
        console.log("Server is listening to port " + port);
        console.log("Test the API at http://localhost:" + port);
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy. Trying port ${port + 1}`);
            server.close();
            app.listen(port + 1, () => {
                console.log(`Server is now listening on port ${port + 1}`);
                console.log(`Test the API at http://localhost:${port + 1}`);
            });
        } else {
            console.error('Server error:', error);
        }
    });
};

startServer();

// Export the app for Vercel
module.exports = app;
