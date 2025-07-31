// // models/Proposal.js
const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  rfpId: { type: mongoose.Schema.Types.ObjectId, ref: "RFP", required: true },
  title: { type: String, required: true },
  client: { type: String, required: true },
  generatedProposal: { type: Object, required: true, default: {} },
  images: { type: [String], default: [] },
  companyMail: { type: String, required: true },
  deadline: { type: Date, required: true },
  status: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  currentEditor: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeProfile", required: true, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  isSaved: { type: Boolean, default: false },
  savedAt: { type: Date, default: null },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  restoreBy: { type: Date, default: null },
  restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  restoredAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Proposal', ProposalSchema);
