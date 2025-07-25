// models/EmployeeProfile.js
const mongoose = require("mongoose");

const employeeProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  linkedIn: { type: String, default: "No linkedIn" },
  location: { type: String, default: "No location" },
  companyName: { type: String, default: "No company" },
  jobTitle: { type: String, required: true },
  about: { type: String, default: "No description" },
  department: { type: String, default: "No department" },
  team: { type: String, default: "No team" },
  accessLevel: { type: String, default: "Viewer" },
  logoUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("EmployeeProfile", employeeProfileSchema);