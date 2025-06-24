const mongoose = require('mongoose');

const SavedRFPSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  rfpId: { type: String, required: true },
  rfp: {
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
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.models.SavedRFP || mongoose.model('SavedRFP', SavedRFPSchema);
