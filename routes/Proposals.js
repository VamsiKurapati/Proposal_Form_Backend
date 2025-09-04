const express = require('express');
const router = express.Router();

const { basicComplianceCheck, advancedComplianceCheck, generatePDF, autoSaveProposal } = require('../controllers/proposalController');

router.post('/basicComplianceCheck', basicComplianceCheck);
router.post('/advancedComplianceCheck', advancedComplianceCheck);
router.post('/generatePDF', generatePDF);
router.post('/autoSave', autoSaveProposal);

module.exports = router;