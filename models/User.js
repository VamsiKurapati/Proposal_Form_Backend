const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile: { type: String, required: true },
  role: { type: String, enum: ["SuperAdmin", "company", "employee",], required: true },
  subscription_status: { type: String, enum: ["active", "inactive", "expired"], default: "inactive" },
  subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", default: null },
  stripeCustomerId: { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  payment_method_id: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
