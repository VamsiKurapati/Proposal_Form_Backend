const mongoose = require('mongoose');

const RFPSchema = new mongoose.Schema({
  title: String,
  description: String,
  logo: String,
  budget: String,
  deadline: String,
  organization: String,
  fundingType: String,
  organizationType: String,
  link: String,
  contact: String,
  timeline: String,
}, {
  timestamps: true
});

// Database indexes for performance optimization
RFPSchema.index({ organizationType: 1 });
RFPSchema.index({ fundingType: 1 });
RFPSchema.index({ organization: 1 });
RFPSchema.index({ createdAt: -1 });
// Compound indexes for common query patterns
RFPSchema.index({ organizationType: 1, fundingType: 1 });
RFPSchema.index({ organizationType: 1, createdAt: -1 });

module.exports = mongoose.model('RFP', RFPSchema);
