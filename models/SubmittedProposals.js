const mongoose = require("mongoose");

const submittedProposalSchema = new mongoose.Schema({
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  company: { type: String, required: true },
  status: { type: String, required: true },
  budget: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const SubmittedProposal = mongoose.model("SubmittedProposal", submittedProposalSchema);

module.exports = SubmittedProposal;