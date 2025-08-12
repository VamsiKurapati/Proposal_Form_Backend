const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,  // INR, US
    required: true
  },
  payment_method: {
    type: String,
    enum: ['card', 'paypal', 'upi', 'stripe'],
    required: true
  },
  transaction_id: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Success', 'Failed', 'Pending', 'Refunded', 'Pending Refund'],
    required: true
  },
  paid_at: {
    type: Date,
    required: false,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
