const mongoose = require("mongoose");
 
const supportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
 
  category: {
    type: String,
    enum: [
      'Billing & Payments',
      'Proposal Issues',
      'Account & Access',
      'Technical Errors',
      'Feature Requests',
      'Others'
    ],
    default: 'Others'
  },
 
  subCategory: { type: String },
 
  description: { type: String, required: true },
 
  Resolved_Description: { type: String, required: false},
 
  status: {
    type: String,
    enum: ['Created', 'In Progress', 'Completed', 'Withdrawn'],
    default: 'Created'
  },
 
  attachments: [
    {
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
 
  adminMessages: [
    {
      message: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
 
  userMessages: [
    {
      message: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
 
  isOpen: { type: Boolean, default: false },
 
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low'
  }
}, { timestamps: true });
 
 

module.exports = mongoose.model("Support", supportSchema);