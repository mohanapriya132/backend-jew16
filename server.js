// Import the Express library so we can create a web server
const express = require('express');

// Create an Express application (our server)
const app = express();

// Define the port number the server will listen on
const PORT = 5000;

// Tell Express to parse incoming JSON request bodies automatically
app.use(express.json());

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// Define a GET route at /api/test
// When someone visits this URL, the server sends back a JSON response
app.get('/api/test', (req, res) => {
  // Send a JSON response with a message
  res.json({ message: 'Backend is working!' });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

// Start the server and tell it to listen for requests on PORT 5000
app.listen(PORT, () => {
  // This message is printed to the terminal once the server is up and running
  console.log(`Server is running on http://localhost:${PORT}`);
});
