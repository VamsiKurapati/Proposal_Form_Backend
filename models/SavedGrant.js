const mongoose = require('mongoose');

const SavedGrantSchema = new mongoose.Schema({
    grantId: { type: mongoose.Schema.Types.ObjectId, ref: "Grant", required: true },
    userEmail: { type: String, required: true },
    grant_data: { type: Object, required: true },
}, { timestamps: true });

module.exports = mongoose.model("SavedGrant", SavedGrantSchema);