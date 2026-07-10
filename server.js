// Load environment variables from .env
require('dotenv').config();

// Import the Express library so we can create a web server
const express = require('express');
const crypto = require('crypto');
const razorpay = require('./config/razorpay');

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

// ─── RAZORPAY ROUTES ─────────────────────────────────────────────────────────

// Create an order
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;

    // Options for Razorpay order
    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID, // Send key_id to frontend
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Something went wrong while creating the order.' });
  }
});

// Verify payment signature
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Create a string of order_id and payment_id
    const body = razorpay_order_id + '|' + razorpay_payment_id;

    // Generate the expected signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    // Compare the signatures
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Signatures match! Payment is successful.
      // Fetch payment details to get the actual amount
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      const amountInRupees = payment.amount / 100;
      
      console.log('✅ Payment Successful');
      console.log(`Payment ID: ${razorpay_payment_id}`);
      console.log(`Original amount received: ${amountInRupees}`);

      // Here you would typically update the order status in your database
      res.json({ success: true, message: 'Payment verified successfully.' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature. Payment verification failed.' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Internal server error during verification.' });
  }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

// Start the server and listen for incoming requests on PORT
app.listen(PORT, () => {
  // This message is printed to the terminal once the server is up and running
  console.log(`Server is running on http://localhost:${PORT}`);
});
