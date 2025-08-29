const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  monthlyPrice: { type: Number, required: true, min: 0 },
  yearlyPrice: { type: Number, required: true, min: 0 },
  maxEditors: { type: Number, required: true, min: 0 },
  maxViewers: { type: Number, required: true, min: 0 },
  maxRFPProposalGenerations: { type: Number, required: true, min: 0 },
  maxGrantProposalGenerations: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
