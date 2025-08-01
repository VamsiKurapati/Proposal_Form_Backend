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


router.get('/getAllRFP', verifyUser(["company", "employee"]), getAllRFP);
router.get('/getSavedAndDraftRFPs', verifyUser(["company", "employee"]), getSavedAndDraftRFPs);


router.post('/saveRFP', verifyUser(["company", "employee"]), saveRFP);
router.post('/unsaveRFP', verifyUser(["company", "employee"]), unsaveRFP);
router.post('/saveDraftRFP', verifyUser(["company", "employee"]), saveDraftRFP);

router.post('/sendDataForProposalGeneration', verifyUser(["company", "editor"]), sendDataForProposalGeneration);
router.post('/triggerRFPDiscovery', verifyUser(["company", "employee"]), sendDataForRFPDiscovery);

module.exports = router;
