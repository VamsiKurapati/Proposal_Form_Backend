const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
  ticket_id: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  desc: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'In progress', 'Resolved'],
    default: 'Pending'
  },
  priority: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low'
  },
  type: {
    type: String,
    required: true,
    enum: ['Billing & Payments', 'Proposal issues', 'Account & Access', 'Technical Errors', 'Feature Requests', 'Others'],
    default: 'Others'
  },
  resolutionMessage: { type: String, default: "" },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Support", supportSchema);
