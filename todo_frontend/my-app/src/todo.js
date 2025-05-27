import { useEffect, useState } from "react"

export default function Todo() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [todos, setTodos] = useState([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [editId, setEditId] = useState(-1);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Edit states
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");

    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
    
    const handleSubmit = async () => {
        if (!title.trim()) {
            setError("Title is required");
            return;
        }
        
        setError("");
        setLoading(true);
        try {
            const response = await fetch(apiUrl+"/todos", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim()
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Network error' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const newTodo = await response.json();
            setTodos([newTodo, ...todos]);
            setTitle("");
            setDescription("");
            setMessage("Item added successfully");
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            console.error('Error creating todo:', err);
            setError(err.message || "Unable to create Todo item");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getItems();
    }, []);

    const getItems = async () => {
        try {
            const response = await fetch(apiUrl+"/todos");
            if (!response.ok) {
                throw new Error("Failed to fetch todos");
            }
            const data = await response.json();
            setTodos(data);
        } catch (err) {
            setError("Failed to load todos");
        } finally {
            setInitialLoading(false);
        }
    }

    const handleEdit = (item) => {
        setEditId(item._id);
        setEditTitle(item.title);
        setEditDescription(item.description);
        setError("");
    }

    const handleUpdate = async () => {
        if (!editTitle.trim()) {
            setError("Title is required");
            return;
        }

        setError("");
        setLoading(true);
        try {
            const response = await fetch(apiUrl+"/todos/"+editId, {
                method: "PUT",
                headers: {
                    'Content-Type':'application/json'
                },
                body: JSON.stringify({
                    title: editTitle.trim(),
                    description: editDescription.trim()
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to update todo");
            }

            const updatedTodo = await response.json();
            const updatedTodos = todos.map((item) => 
                item._id === editId ? updatedTodo : item
            );

            setTodos(updatedTodos);
            setEditTitle("");
            setEditDescription("");
            setMessage("Item updated successfully");
            setTimeout(() => setMessage(""), 3000);
            setEditId(-1);
        } catch (err) {
            setError(err.message || "Unable to update Todo item");
        } finally {
            setLoading(false);
        }
    }

    const handleEditCancel = () => {
        setEditId(-1);
        setError("");
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(apiUrl+'/todos/'+id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Failed to delete todo");
            }

            const updatedTodos = todos.filter((item) => item._id !== id);
            setTodos(updatedTodos);
            setMessage("Item deleted successfully");
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setError("Failed to delete todo");
        } finally {
            setLoading(false);
        }
    }

    if (initialLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{height: "100vh"}}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-5">
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-success text-white">
                            <h1 className="mb-0">ToDo Project with MERN stack</h1>
                        </div>
                        <div className="card-body">
                            <h3>Add Item</h3>
                            {message && <div className="alert alert-success">{message}</div>}
                            {error && <div className="alert alert-danger">{error}</div>}
                            
                            <div className="form-group d-flex gap-2 mb-4">
                                <input 
                                    placeholder="Title" 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    value={title} 
                                    className="form-control" 
                                    type="text"
                                    disabled={loading}
                                />
                                <input 
                                    placeholder="Description" 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    value={description} 
                                    className="form-control" 
                                    type="text"
                                    disabled={loading}
                                />
                                <button 
                                    className="btn btn-dark" 
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? 'Adding...' : 'Submit'}
                                </button>
                            </div>

                            <h3>Tasks</h3>
                            {todos.length === 0 ? (
                                <p className="text-muted">No todos yet. Add one above!</p>
                            ) : (
                                <div className="list-group">
                                    {todos.map((item) => (
                                        <div key={item._id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center my-2">
                                            <div className="flex-grow-1 me-3">
                                                {editId === item._id ? (
                                                    <div className="d-flex gap-2">
                                                        <input
                                                            placeholder="Title"
                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                            value={editTitle}
                                                            className="form-control"
                                                            type="text"
                                                            disabled={loading}
                                                        />
                                                        <input
                                                            placeholder="Description"
                                                            onChange={(e) => setEditDescription(e.target.value)}
                                                            value={editDescription}
                                                            className="form-control"
                                                            type="text"
                                                            disabled={loading}
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <h5 className="mb-1">{item.title}</h5>
                                                        {item.description && (
                                                            <p className="mb-1 text-muted">{item.description}</p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <div className="d-flex gap-2">
                                                {editId === item._id ? (
                                                    <>
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={handleUpdate}
                                                            disabled={loading}
                                                        >
                                                            {loading ? 'Updating...' : 'Update'}
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={handleEditCancel}
                                                            disabled={loading}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn btn-warning"
                                                            onClick={() => handleEdit(item)}
                                                            disabled={loading}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-danger"
                                                            onClick={() => handleDelete(item._id)}
                                                            disabled={loading}
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}