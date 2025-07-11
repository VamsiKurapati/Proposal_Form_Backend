// models/EmployeeProfile.js
const mongoose = require("mongoose");

const freelancerProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    linkedIn: { type: String, default: "No linkedIn" },
    location: { type: String, default: "No location" },
    jobTitle: { type: String, required: true },
    about: { type: String, default: "No description" },
    logoUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("FreelancerProfile", freelancerProfileSchema);