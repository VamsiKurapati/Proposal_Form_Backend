//rfpDiscoveryMLModel.js
const express = require('express');
const router = express.Router();

const verifyUser = require('../utils/verifyUser');

const { getUsersData, matchedRFPData, getAllRFP, saveRFP, unsaveRFP, saveDraftRFP, postAllRFPs, getUserandRFPData, generatedProposal, getSavedAndDraftRFPs, sendDataForProposalGeneration, sendDataForRFPDiscovery } = require('../controllers/rfpDiscoveryMLModelController');

router.get('/getUsersData', getUsersData);
router.post('/matchedRFPdata', matchedRFPData);
router.get('/getUserandRFPData', getUserandRFPData);
router.post('/generatedProposal', generatedProposal);
router.post('/postAllRFPs', postAllRFPs);


router.get('/getAllRFP', verifyUser(["company", "editor", "viewer"]), getAllRFP);
router.get('/getSavedAndDraftRFPs', verifyUser(["company", "editor", "viewer"]), getSavedAndDraftRFPs);


router.post('/saveRFP', verifyUser(["company", "editor", "viewer"]), saveRFP);
router.post('/unsaveRFP', verifyUser(["company", "editor", "viewer"]), unsaveRFP);
router.post('/saveDraftRFP', verifyUser(["company", "editor"]), saveDraftRFP);

router.post('/sendDataForProposalGeneration', verifyUser(["company", "editor"]), sendDataForProposalGeneration);
router.post('/sendDataForRFPDiscovery', verifyUser(["company", "editor", "viewer"]), sendDataForRFPDiscovery);

module.exports = router;
