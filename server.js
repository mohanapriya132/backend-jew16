// Load environment variables from .env
require('dotenv').config();

// Import the Express library so we can create a web server
const express = require('express');
const crypto = require('crypto');
const razorpay = require('./config/razorpay');
const supabase = require('./config/supabase');

// Import the cors package to allow cross-origin requests from the frontend
const cors = require('cors');

// Create an Express application (our server)
const app = express();

// Define the port number — Render sets PORT automatically via environment variable
// Falls back to 5000 for local development
const PORT = process.env.PORT || 5000;

// ─── STARTUP CHECKS ───────────────────────────────────────────────────────────
// Warn immediately if critical env vars are missing so issues are caught on deploy
if (!process.env.SUPABASE_URL) {
  console.error('❌ MISSING ENV VAR: SUPABASE_URL is not set!');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ MISSING ENV VAR: SUPABASE_SERVICE_ROLE_KEY is not set!');
}
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('✅ Supabase env vars loaded successfully.');
}

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
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer_name,
      customer_email,
    } = req.body;

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
      // Fetch payment details from Razorpay to get the actual amount and currency
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      const amountInRupees = payment.amount / 100;

      console.log('✅ Payment Successful');
      console.log(`Payment ID: ${razorpay_payment_id}`);
      console.log(`Original amount received: ${amountInRupees}`);

      // ─── Save to Supabase (isolated — will never crash the payment flow) ────
      console.log('💾 Attempting Supabase insert...');
      try {
        const insertPayload = {
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
          amount: amountInRupees,
          currency: payment.currency,
          payment_status: 'success',
          customer_name: customer_name || null,
          customer_email: customer_email || null,
        };

        console.log('💾 Insert payload:', JSON.stringify(insertPayload));

        const { data, error: dbError } = await supabase
          .from('payments')
          .insert([insertPayload])
          .select(); // .select() forces Supabase to return the inserted row & surface real errors

        if (dbError) {
          console.error('❌ Supabase insert failed:', JSON.stringify(dbError, null, 2));
        } else {
          console.log('💾 Payment saved to Supabase successfully');
          console.log('💾 Inserted row:', JSON.stringify(data));
        }
      } catch (supabaseErr) {
        // Catch any unexpected exception from the Supabase client itself
        console.error('❌ Supabase insert threw an exception:', supabaseErr.message);
        console.error('❌ Full exception:', JSON.stringify(supabaseErr, null, 2));
      }
      // ────────────────────────────────────────────────────────────────────────

      // Return success to the frontend (payment already verified — DB is secondary)
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
