const mongoose = require('mongoose');

const DraftRFPSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    rfpId: { type: mongoose.Schema.Types.ObjectId, ref: "RFP", required: true },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal", required: true },
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
        contact: String,
        timeline: String
    },
    generatedProposal: { type: Object, required: true },
    currentEditor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.models.DraftRFP || mongoose.model('DraftRFP', DraftRFPSchema);
