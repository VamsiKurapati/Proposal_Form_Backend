// // models/Proposal.js
const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  companyName: String,
  companyOverview: String,
  mission: String,
  vision: String,
  yearEstablished: String,
  employeeCount: String,
  teamMembers: String,
  teamExperience: String,
  certifications: String,
  technologies: String,
  pastProjects: String,
  clientPortfolio: String,
  awards: String,
  complianceStandards: String,
  geographicalPresence: String,
  preferredIndustries: String,
  uploadedDocuments: [
    {
      fileId: mongoose.Types.ObjectId,
      filename: String
    }
  ],
  name: { type: String, required: true },   // Submitter's name
  email: { type: String, required: true },   // Submitter's email
}, { timestamps: true });

module.exports = mongoose.model('Proposal', ProposalSchema);
