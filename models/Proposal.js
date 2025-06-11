// // models/Proposal.js
// const mongoose = require('mongoose');

// const ProposalSchema = new mongoose.Schema({
//   name: String,
//   email: String,
//   companyDetails: String,
//   industry: String,
//   description: String,
//   mission: String,
//   team: String,
//   experience: String,
//   certifications: String,
//   qualifications: String,
//   projectFiles: [String] // Filenames in GridFS
// }, { timestamps: true });

// module.exports = mongoose.model('Proposal', ProposalSchema);


// models/Proposal.js
const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema(
  {
    companyDetails: { type: String, required: true },
    industry: { type: String, required: true },
    description: { type: String, required: true },
    mission: { type: String, required: true },
    team: { type: String, required: true },
    experience: { type: String, required: true },
    certifications: { type: String, required: true },
    qualifications: { type: String, required: true },

    // Reference to uploaded project documents in GridFS
    projectFiles: [
      {
        filename: String,        // GridFS filename
        fileId: mongoose.Types.ObjectId // GridFS file ID
      }
    ],

    name: { type: String, required: true },   // Submitter's name
    email: { type: String, required: true }   // Submitter's email
  },
  { timestamps: true }
);

module.exports = mongoose.model('Proposal', ProposalSchema);
