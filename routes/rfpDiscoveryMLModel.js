//rfpDiscoveryMLModel.js
const express = require('express');
const router = express.Router();

const verifyUser = require('../utils/verifyUser');

const { getUsersData, matchedRFPData, getAllRFP, save, unsave, getUserandRFPData, generatedProposal, getSavedAndDraftRFPs, saveDraftRFP, sendDataForProposalGeneration } = require('../controllers/rfpDiscoveryMLModelController');

router.get('/getUsersData', getUsersData);
router.post('/matchedRFPdata', matchedRFPData);
router.get('/getAllRFP', verifyUser(["company", "editor", "viewer"]), getAllRFP);
router.post('/saveRFP', verifyUser(["company", "editor", "viewer"]), save);
router.post('/unsaveRFP', verifyUser(["company", "editor", "viewer"]), unsave);

router.get('/getUserandRFPData', getUserandRFPData);
router.post('/generatedProposal', generatedProposal);

router.get('/getSavedAndDraftRFPs', verifyUser(["company", "editor", "viewer"]), getSavedAndDraftRFPs);
router.post('/saveDraftRFP', verifyUser(["company", "editor", "viewer"]), saveDraftRFP);

router.post('/sendDataForProposalGeneration', verifyUser(["company", "editor", "viewer"]), sendDataForProposalGeneration);

module.exports = router;
