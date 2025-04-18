const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    memberID: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    mobile: {
        type: String,
        required: true
    },
    joinDate: {
        type: Date,
        required: true
    },
    dob: {
        type: Date,
        required: true
    },
    medicalHistory: {
        type: String
    },
    subscriptions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    }]
}, { timestamps: true, strict: true });

module.exports = mongoose.model('Client', ClientSchema);
