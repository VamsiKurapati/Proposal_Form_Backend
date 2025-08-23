const express = require('express');
const router = express.Router();

const { basicComplianceCheck, advancedComplianceCheck, generatePDF } = require('../controllers/proposalController');

router.post('/basicComplianceCheck', basicComplianceCheck);
router.post('/advancedComplianceCheck', advancedComplianceCheck);
router.post('/generatePDF', generatePDF);

module.exports = router;