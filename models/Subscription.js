const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plan_name: { type: String, required: true },
  plan_price: { type: Number, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  canceled_at: { type: Date, default: null },
  renewal_date: { type: Date, default: null },
  max_editors: { type: Number, required: true },
  max_viewers: { type: Number, required: true },
  max_rfp_proposal_generations: { type: Number, required: true },
  max_grant_proposal_generations: { type: Number, required: true },
  auto_renewal: { type: Boolean, default: true },
  stripeSubscriptionId: { type: String, default: null },
  stripePriceId: { type: String, default: null }
}, { timestamps: true });


module.exports = mongoose.model("Subscription", subscriptionSchema);