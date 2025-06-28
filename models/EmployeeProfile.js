// models/EmployeeProfile.js
const mongoose = require("mongoose");

const employeeProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyName: String,
  location: String,
  jobTitle: String,
  linkedin: String,
});

module.exports = mongoose.model("EmployeeProfile", employeeProfileSchema);