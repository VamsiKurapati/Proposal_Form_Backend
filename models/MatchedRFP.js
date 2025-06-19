const mongoose = require('mongoose');

const matchedRFPSchema = new mongoose.Schema({
  title: String,
  description: String,
  logo: String,
  match: Number,
  budget: String,
  deadline: String,
  organization: String,
  fundingType: String,
  organizationType: String,
  link: String,
  type: String,
  email: { type: String, required: true },
}, {
  timestamps: true
});

module.exports = mongoose.model('MatchedRFP', matchedRFPSchema);
