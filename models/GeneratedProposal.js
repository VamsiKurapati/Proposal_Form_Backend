
const mongoose = require('mongoose');

const GeneratedProposalSchema = new mongoose.Schema({
  coverLetter: {
    type: String,
    required: true,
  },
  executiveSummary: {
    type: String,
    required: true,
  },
  projectPlan: {
    type: String,
    required: true,
  },
  partnershipOverview: {
    type: String,
    required: true,
  },
  referencesAndProvenResults: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  rfpTitle: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('GeneratedProposal', GeneratedProposalSchema);
