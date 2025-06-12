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


// models/Proposal.js
// const mongoose = require('mongoose');

// const ProposalSchema = new mongoose.Schema(
//   {
//     companyDetails: { type: String, required: true },
//     industry: { type: String, required: true },
//     description: { type: String, required: true },
//     mission: { type: String, required: true },
//     team: { type: String, required: true },
//     experience: { type: String, required: true },
//     certifications: { type: String, required: true },
//     qualifications: { type: String, required: true },

//     // Reference to uploaded project documents in GridFS
//     projectFiles: [
//       {
//         filename: String,        // GridFS filename
//         fileId: mongoose.Types.ObjectId // GridFS file ID
//       }
//     ],

//     name: { type: String, required: true },   // Submitter's name
//     email: { type: String, required: true }   // Submitter's email
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model('Proposal', ProposalSchema);
