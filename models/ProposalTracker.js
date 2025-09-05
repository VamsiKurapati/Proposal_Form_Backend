const mongoose = require('mongoose');

const ProposalTrackerSchema = new mongoose.Schema({
    rfpId: { type: mongoose.Schema.Types.ObjectId, ref: "RFP", required: true },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal", required: true, default: null },
    grantId: { type: mongoose.Schema.Types.ObjectId, ref: "Grant", required: true, default: null },
    companyMail: { type: String, required: true },
    status: { type: String, required: true },
    trackingId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ProposalTracker', ProposalTrackerSchema);
