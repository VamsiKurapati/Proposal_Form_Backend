// models/CompanyProfile.js
const mongoose = require("mongoose");

const companyProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyName: { type: String, required: true },
  industry: { type: String, required: true },
  location: { type: String, required: true },
  website: { type: String, required: true },
  linkedIn: { type: String, required: true },
  services: { type: [String], default: [] },
  establishedYear: { type: Number, required: true },
  departments: { type: Number, default: 0 },
  teamSize: { type: Number, default: 0 },
  numberOfEmployees: { type: String, default: "0-10" },
  employees: [
    {
      name: String,
      about: String,
      jobTitle: String,
      email: String,
      phone: String,
      linkedIn: String,
      department: { type: String, default: "General" },
      team: { type: String, default: "General" },
      accessLevel: String, // e.g., 'fullAccess', 'admin', 'editor', 'viewer'
    },
  ],
  bio: { type: String, required: true },
  caseStudies: [
    {
      title: { type: String, required: true },
      company: { type: String, required: true },
      image: { type: String, required: true },
      link: { type: String, required: true },
      readTime: { type: Number, required: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
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
}, { timestamps: true });

module.exports = mongoose.model("CompanyProfile", companyProfileSchema);
