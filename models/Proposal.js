// // models/Proposal.js
const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  rfpId: { type: mongoose.Schema.Types.ObjectId, ref: "RFP", required: true },
  generatedProposal: { type: Object, required: true, default: {} },
  status: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  currentUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  isSaved: { type: Boolean, default: false },
  savedAt: { type: Date, default: null },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

module.exports = mongoose.model('Proposal', ProposalSchema);
