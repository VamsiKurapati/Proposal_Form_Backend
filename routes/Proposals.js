const express = require('express');
const router = express.Router();

const verifyUser = require('../utils/verifyUser');

const { basicComplianceCheck, advancedComplianceCheck, generatePDF, autoSaveProposal } = require('../controllers/proposalController');

router.post('/basicComplianceCheck', verifyUser(["company", "Editor"]), basicComplianceCheck);
router.post('/advancedComplianceCheck', verifyUser(["company", "Editor"]), advancedComplianceCheck);
router.post('/generatePDF', verifyUser(["company", "Editor"]), generatePDF);
router.post('/autoSave', verifyUser(["company", "Editor"]), autoSaveProposal);

module.exports = router;