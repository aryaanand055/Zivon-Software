// routes/adms.js
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

router.use(bodyParser.urlencoded({ extended: false }));

router.post('/adms', (req, res) => {
    const logs = req.body;
    console.log('Received ADMS data:', logs);
    res.send('OK'); // ADMS expects "OK" or another specific message
});

module.exports = router;
