// utils/clientStatus.js
const Subscription = require('../models/Subscription');

async function getClientActivityMap() {
    const today = new Date();
    const subscriptions = await Subscription.find({}, 'clientId startDate endDate');

    const activeMap = new Map();

    subscriptions.forEach(sub => {
        const clientId = sub.clientId.toString();
        const start = new Date(sub.startDate);
        const end = new Date(sub.endDate);

        if (!activeMap.has(clientId)) {
            activeMap.set(clientId, false);
        }

        if (today >= start && today <= end) {
            activeMap.set(clientId, true);
        }
    });

    return activeMap;
}

module.exports = { getClientActivityMap };
