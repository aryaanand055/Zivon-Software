// routes/logs.js
const express = require('express');
const router = express.Router();

router.get('/logs', (req, res) => {
    res.send('Logs endpoint is working');
});

router.post('/logs', (req, res) => {
    const logs = req.body;
    console.log('Received logs:', logs);
    res.send({ status: 'ok' });
});


module.exports = router;
