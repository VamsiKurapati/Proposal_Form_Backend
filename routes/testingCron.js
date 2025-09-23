const express = require('express');

const router = express.Router();

const { fetchGrants, fetchRFPs } = require('../controllers/cronJobControllers');

router.get('/fetchGrants', fetchGrants);
router.get('/fetchRFPs', fetchRFPs);

module.exports = router;