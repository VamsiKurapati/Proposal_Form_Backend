// models/EmployeeProfile.js
const mongoose = require("mongoose");

const employeeProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", },
  companyMail: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  linkedIn: { type: String, default: "No linkedIn" },
  location: { type: String, default: "No location" },
  jobTitle: { type: String, required: true },
  about: { type: String, default: "No description" },
  accessLevel: { type: String, default: "Viewer" },
  logoUrl: { type: String, default: "https://via.placeholder.com/150" },
}, { timestamps: true });

module.exports = mongoose.model("EmployeeProfile", employeeProfileSchema);