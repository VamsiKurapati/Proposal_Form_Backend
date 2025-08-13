const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
<<<<<<< HEAD
  ticketId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: [
      'Billing & Payments',
      'Proposal Issues',
      'Account & Access',
      'Technical Errors',
      'Feature Requests',
      'Others'
    ],
=======
  ticket_id: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  desc: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['Open', 'In progress', 'Completed'],
    default: 'Open'
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
>>>>>>> origin/Staging
    default: 'Others'
  },
  subCategory: { type: String }, 
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Created', 'In Progress', 'Completed'],
    default: 'Created'
  },
  // comments: [
  //   {
  //     user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  //     role: { type: String, enum: ['user', 'superadmin'], required: true },
  //     comment: { type: String, required: true },
  //     createdAt: { type: Date, default: Date.now }
  //   }
  // ],
  
  attachments: [
    {
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Support", supportSchema);
