//rfpDiscoveryMLModel.js
const express = require('express');
const router = express.Router();

const verifyUser = require('../utils/verifyUser');

const { getUsersData, matchedRFPData, getRecommendedAndSavedRFPs, getOtherRFPs, saveRFP, unsaveRFP, saveDraftRFP, postAllRFPs, getUserandRFPData, generatedProposal, getSavedAndDraftRFPs, sendDataForProposalGeneration, sendDataForRFPDiscovery, handleFileUploadAndSendForRFPExtraction } = require('../controllers/mlPipelineController');

router.get('/getUsersData', getUsersData);
router.post('/matchedRFPdata', matchedRFPData);
router.get('/getUserandRFPData', getUserandRFPData);
router.post('/generatedProposal', generatedProposal);
router.post('/postAllRFPs', postAllRFPs);


router.get('/getRecommendedAndSavedRFPs', verifyUser(["company", "employee"]), getRecommendedAndSavedRFPs);
router.post('/getOtherRFPs', verifyUser(["company", "employee"]), getOtherRFPs);
router.get('/getSavedAndDraftRFPs', verifyUser(["company", "employee"]), getSavedAndDraftRFPs);


router.post('/saveRFP', verifyUser(["company", "employee"]), saveRFP);
router.post('/unsaveRFP', verifyUser(["company", "employee"]), unsaveRFP);
router.post('/saveDraftRFP', verifyUser(["company", "employee"]), saveDraftRFP);

router.post('/sendDataForProposalGeneration', verifyUser(["company", "Editor"]), sendDataForProposalGeneration);
router.post('/triggerRFPDiscovery', verifyUser(["company", "employee"]), sendDataForRFPDiscovery);
router.post('/uploadRFP', verifyUser(["company", "employee"]), handleFileUploadAndSendForRFPExtraction);

module.exports = router;
