// models/Package.js
const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: false },
    duration: { type: Number, required: true }, // duration in days
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Package', packageSchema);
