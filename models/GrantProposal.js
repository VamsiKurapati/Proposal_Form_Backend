const mongoose = require('mongoose');

const GrantProposalSchema = new mongoose.Schema({
    grantId: { type: mongoose.Schema.Types.ObjectId, ref: "Grant", required: true },
    project_inputs: { type: Object, required: true },
    initialProposal: { type: Object, required: true },
    title: { type: String, required: true },
    client: { type: String, required: true },
    generatedProposal: { type: Object, default: null },
    companyMail: { type: String, required: true },
    deadline: { type: String, required: true },
    url: { type: String, required: true },
    status: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
    currentEditor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isSaved: { type: Boolean, default: false },
    savedAt: { type: Date, default: null },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isRestored: { type: Boolean, default: false },
    restoredAt: { type: Date, default: null },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    restoredAt: { type: Date, default: null },
});

module.exports = mongoose.model("GrantProposal", GrantProposalSchema);