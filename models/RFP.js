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
  type_: String,
  contact: String,
  timeline: String,
  email: { type: String, required: true },
}, {
  timestamps: true
});

module.exports = mongoose.model('RFP', RFPSchema);
