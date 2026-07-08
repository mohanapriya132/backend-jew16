// Import the Express library so we can create a web server
const express = require('express');

// Import the cors package to allow cross-origin requests from the frontend
const cors = require('cors');

// Create an Express application (our server)
const app = express();

// Define the port number — Render sets PORT automatically via environment variable
// Falls back to 5000 for local development
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

// Enable CORS for all routes — allows the React frontend to talk to this backend
app.use(cors());

// Tell Express to parse incoming JSON request bodies automatically
app.use(express.json());

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// Define a GET route at /api/test
// When someone visits this URL, the server sends back a JSON response
app.get('/api/test', (req, res) => {
  // Send a JSON response with a success message
  res.json({ message: 'Backend is working!' });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

// Start the server and listen for incoming requests on PORT
app.listen(PORT, () => {
  // This message is printed to the terminal once the server is up and running
  console.log(`Server is running on http://localhost:${PORT}`);
});
