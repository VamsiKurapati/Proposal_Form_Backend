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

module.exports = mongoose.model('RFP', RFPSchema);
