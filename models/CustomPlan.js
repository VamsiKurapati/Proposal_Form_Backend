const mongoose = require("mongoose");
// const User = require("./User");
const customPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  planType: { type: String, required: true },
  maxEditors: { type: Number, required: true },
  maxViewers: { type: Number, required: true },
  maxRFPProposalGenerations: { type: Number, required: true },
  maxGrantProposalGenerations: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model("CustomPlan", customPlanSchema);