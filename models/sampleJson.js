const mongoose = require('mongoose');

const sampleJsonSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    data: {
        type: Object,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('sampleJson', sampleJsonSchema);