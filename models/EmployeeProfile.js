// models/EmployeeProfile.js
const mongoose = require("mongoose");

const employeeProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyName: String,
  linkedIn: String,
  location: String,
  jobTitle: String,
  about: { type: String, default: "No description" },
  department: String,
  team: String,
  accessLevel: String,
}, { timestamps: true });

module.exports = mongoose.model("EmployeeProfile", employeeProfileSchema);