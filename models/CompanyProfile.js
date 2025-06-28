// models/CompanyProfile.js
const mongoose = require("mongoose");

const companyProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyName: String,
  industry: String,
  employees: String,
  bio: String,
  caseStudies: [String],
  licenses: [String],
  documents: [
    {
      fileId: mongoose.Schema.Types.ObjectId,
      filename: String,
    },
  ],
  proposals: [
    {
      fileId: mongoose.Schema.Types.ObjectId,
      filename: String,
    },
  ],
});

module.exports = mongoose.model("CompanyProfile", companyProfileSchema);
