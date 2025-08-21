const mongoose = require('mongoose');

const DraftGrantSchema = new mongoose.Schema({
    grantId: { type: mongoose.Schema.Types.ObjectId, ref: "Grant", required: true },
    email: { type: String, required: true },
    grant_data: { type: Object, required: true },
    project_inputs: { type: Object, required: true },
    proposal: { type: Object, required: true },
}, { timestamps: true });

module.exports = mongoose.model("DraftGrant", DraftGrantSchema);