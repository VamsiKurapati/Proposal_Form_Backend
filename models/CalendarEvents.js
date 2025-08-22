const mongoose = require("mongoose");

const calendarEventSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyProfile", required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeProfile", required: true },
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal", required: true },
  title: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ["In Progress", "Submitted", "Won", "Rejected", "Deadline"], default: "Deadline" },
}, { timestamps: true });

module.exports = mongoose.model("CalendarEvent", calendarEventSchema);