//Using Express
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

//create an instance of express
const app = express();

// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://todo-list-pink-one-44.vercel.app'
];

app.use(cors({
    origin: function(origin, callback) {
        // allow requests with no origin (like mobile apps, Postman or curl requests)
        if(!origin) return callback(null, true);
        
        if(allowedOrigins.indexOf(origin) === -1){
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
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

// Modify MongoDB connection with better error handling
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => {
    console.log('Successfully connected to MongoDB Atlas.');
})
.catch((err) => {
    console.error('Error connecting to MongoDB:', err);
    // Don't exit process in serverless environment
    if (process.env.VERCEL) {
        console.error('Running in Vercel, continuing despite MongoDB connection error');
    } else {
        process.exit(1);
    }
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
app.get('/', async (req, res) => {
    try {
        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
            });
        }
        res.json({ 
            status: 'ok',
            message: 'Server is running',
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

//Create a new todo item
app.post('/todos', async (req, res) => {
    try {
        // Ensure MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
            });
        }

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
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

//Get all items
app.get('/todos', async (req, res) => {
    try {
        // Ensure MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
            });
        }

        const todos = await todoModel.find().sort({ createdAt: -1 });
        res.json(todos);
    } catch (error) {
        console.error('Error fetching todos:', error);
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update a todo item
app.put("/todos/:id", async (req, res) => {
    try {
        // Ensure MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
            });
        }

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
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete a todo item
app.delete('/todos/:id', async (req, res) => {
    try {
        // Ensure MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
            });
        }

        const id = req.params.id;
        const deletedTodo = await todoModel.findByIdAndDelete(id);
        if (!deletedTodo) {
            return res.status(404).json({ message: "Todo not found" });
        }
        res.status(204).end();    
    } catch (error) {
        console.error('Error deleting todo:', error);
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Something broke!',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process in production/serverless environment
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Start server with error handling
if (process.env.NODE_ENV !== 'test') {
    const startServer = () => {
        const port = process.env.PORT || 3001;
        try {
            const server = app.listen(port, () => {
                console.log(`Server is listening on port ${port}`);
                console.log(`Test the API at http://localhost:${port}`);
            });

            server.on('error', (error) => {
                console.error('Server error:', error);
                if (error.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is busy. Trying port ${port + 1}`);
                    server.close();
                    app.listen(port + 1);
                }
            });
        } catch (error) {
            console.error('Failed to start server:', error);
            // Don't exit in production/serverless
            if (process.env.NODE_ENV !== 'production') {
                process.exit(1);
            }
        }
    };

    startServer();
}
