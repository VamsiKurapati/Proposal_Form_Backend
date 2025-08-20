const express = require('express');
const router = express.Router();

const { basicComplianceCheck, advancedComplianceCheck } = require('../controllers/proposalController');

const { generatePDF } = require('../utils/pdfGenerator');

router.post('/basicComplianceCheck', basicComplianceCheck);
router.post('/advancedComplianceCheck', advancedComplianceCheck);
router.post('/generatePDF', generatePDF);


module.exports = router;