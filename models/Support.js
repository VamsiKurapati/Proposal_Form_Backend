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
  Resolved_Description: { type: String, required: false , default:"Admin will contact you soon"},
  status: { 
    type: String, 
    enum: ['Created','In Progress', 'Completed','Withdrawn'],
    default: 'Created'
  },  
  
  isOpen: { type: Boolean, default: false },
  attachments: [
    {
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });



module.exports = mongoose.model("Support", supportSchema);
