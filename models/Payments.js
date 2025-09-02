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
  transaction_id: {
    type: String,
    required: false,
    default: null
  },
  companyName: {
    type: String,
    required: false,
    default: null
  },
  payment_method: {
    type: String,
    required: false,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
