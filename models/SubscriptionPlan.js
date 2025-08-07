const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  billing_cycle: { 
    type: String, 
    required: true, 
    enum: ['monthly', 'quarterly', 'yearly'] 
  },
  features: { type: [String], default: [] },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
