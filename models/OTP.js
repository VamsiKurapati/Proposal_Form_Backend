const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: Date.now + 10 * 60 * 1000 },
}, { timestamps: true });

module.exports = mongoose.model('OTP', otpSchema);