const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plan_id: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  canceled_at: { type: Date, default: null },
  renewal_date: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Subscription", subscriptionSchema);
