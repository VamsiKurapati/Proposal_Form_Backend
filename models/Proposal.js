// models/Proposal.js
const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  name: String,
  email: String,
  companyDetails: String,
  industry: String,
  description: String,
  mission: String,
  team: String,
  experience: String,
  qualifications: String,
  projects: String
}, { timestamps: true });

module.exports = mongoose.model('Proposal', ProposalSchema);
