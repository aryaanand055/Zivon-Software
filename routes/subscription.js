const express = require('express');
const router = express.Router();

// Create a new subscription for a client (with payment info)



// // Get all subscriptions for a client
// router.get('/:clientId/subscriptions', async (req, res) => {
//     try {
//         const client = await Client.findById(req.params.clientId).populate('subscriptions');
//         if (!client) {
//             return res.status(404).json({ error: 'Client not found' });
//         }
//         res.json(client.subscriptions);
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to retrieve subscriptions' });
//     }
// });



module.exports = router;
