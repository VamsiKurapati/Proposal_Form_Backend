// // models/Proposal.js
const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  rfpId: { type: mongoose.Schema.Types.ObjectId, ref: "RFP", required: true },
  title: { type: String, required: true },
  client: { type: String, required: true },
  initialProposal: { type: Object, required: true, default: null },
  generatedProposal: { type: Object, default: null },
  companyMail: { type: String, required: true },
  deadline: { type: Date, required: true },
  url: { type: String, required: true },
  status: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  currentEditor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  restoreBy: { type: Date, default: null },
  restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  restoredAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Proposal', ProposalSchema);
