// Read environment variables
require('dotenv').config();
const Razorpay = require('razorpay');

// Check if keys are available
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('ERROR: Razorpay keys not found in environment variables.');
}

// Initialize the Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = razorpay;
