// models/CompanyProfile.js
const mongoose = require("mongoose");

const companyProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true, unique: true },
  companyName: { type: String, required: true },
  adminName: { type: String, required: true },
  industry: { type: String, required: true },
  location: { type: String, required: true },
  website: { type: String, required: true },
  linkedIn: { type: String, required: true },
  services: { type: [String], default: [] },
  establishedYear: { type: Number, required: true },
  awards: { type: [String], default: [] },
  clients: { type: [String], default: [] },
  preferredIndustries: { type: [String], default: [] },
  numberOfEmployees: { type: String, default: "0-10" },
  employees: [
    {
      employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeProfile", default: null },
      name: String,
      shortDesc: String,
      highestQualification: String,
      skills: [String],
      jobTitle: String,
      email: String,
      phone: String,
      accessLevel: String,
    },
  ],
  bio: { type: String, required: true },
  caseStudies: [
    {
      title: { type: String, required: true },
      about: { type: String, required: true },
      readTime: { type: String, required: true },
      fileUrl: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  licensesAndCertifications: [
    {
      name: { type: String, required: true },
      issuer: { type: String, required: true },
      validTill: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  documents: [
    {
      name: String,
      type: { type: String, default: "PDF" },
      size: { type: Number, required: true },
      url: { type: String, required: true },
      fileId: { type: mongoose.Types.ObjectId, required: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  proposals: [
    {
      title: { type: String, required: true },
      company: { type: String, required: true },
      amount: { type: Number, required: true },
      status: { type: String, default: "In Progress" },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  recentActivities: [
    {
      title: { type: String, required: true },
      description: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  deadlines: [
    {
      title: { type: String, required: true },
      status: { type: String, required: true },
      dueDate: { type: Date, required: true },
      createdAt: { type: Date, default: Date.now },
    }
  ],
  logoUrl: { type: String }, // URL to the company profile image/logo
}, { timestamps: true });

module.exports = mongoose.model("CompanyProfile", companyProfileSchema);
