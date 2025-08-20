const express = require('express');
const router = express.Router();

const { basicComplianceCheck, advancedComplianceCheck } = require('../controllers/proposalController');

router.post('/basicComplianceCheck', basicComplianceCheck);
router.post('/advancedComplianceCheck', advancedComplianceCheck);


module.exports = router;