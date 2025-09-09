const mongoose = require('mongoose');

const ProposalTrackerSchema = new mongoose.Schema({
    rfpId: { type: mongoose.Schema.Types.ObjectId, ref: "RFP", required: false, default: null },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal", required: false, default: null },
    grantId: { type: mongoose.Schema.Types.ObjectId, ref: "Grant", required: false, default: null },
    grantProposalId: { type: mongoose.Schema.Types.ObjectId, ref: "GrantProposal", required: false, default: null },
    companyMail: { type: String, required: true },
    status: { type: String, required: true },
    trackingId: { type: String, required: true },
    formData: { type: Object, required: false, default: null }
}, { timestamps: true });

module.exports = mongoose.model('ProposalTracker', ProposalTrackerSchema);
