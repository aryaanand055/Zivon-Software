// models/Subscription.js
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    receiptID: { type: String, required: true, unique: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    paymentStatus: { type: String, enum: ['paid', 'pending'], default: 'pending' },
    paymentDueDate: { type: Date, required: false, default: Date.now },
    paymentMethod: { type: String, enum: ['cash', 'credit card', 'bank transfer', 'debit card', 'upi'], default: 'upi' },
    offerAmount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
