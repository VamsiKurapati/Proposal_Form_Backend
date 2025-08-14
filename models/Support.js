const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    required: true,
    enum: ['Created', 'Re-Opened', 'In Progress', 'Completed'],
    default: 'Created'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low'
  },
  category: {
    type: String,
    enum: ['Billing & Payments', 'Proposal issues', 'Account & Access', 'Technical Errors', 'Feature Requests', 'Others'],
    default: 'Others'
  },
  subCategory: { type: String },
  description: { type: String, required: true },
  Resolved_Description: { type: String, default: "" },
  attachments: [
    {
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
}, { timestamps: true });

module.exports = mongoose.model("Support", supportSchema);
