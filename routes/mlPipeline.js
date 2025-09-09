//rfpDiscoveryMLModel.js
const express = require('express');
const router = express.Router();

const verifyUser = require('../utils/verifyUser');

const { getRecommendedAndSavedRFPs, getOtherRFPs, saveRFP, unsaveRFP, saveDraftRFP, postAllRFPs, getSavedAndDraftRFPs, sendDataForProposalGeneration, sendDataForRFPDiscovery, handleFileUploadAndSendForRFPExtraction, sendGrantDataForProposalGeneration, getRecentAndSavedGrants, getOtherGrants, getSavedAndDraftGrants, saveGrant, unsaveGrant, saveDraftGrant, unsaveDraftGrant, handleFileUploadAndSendForGrantExtraction, getGrantProposalStatus } = require('../controllers/mlPipelineController');

router.post('/postAllRFPs', postAllRFPs);
router.get('/getRecommendedAndSavedRFPs', verifyUser(["company", "employee"]), getRecommendedAndSavedRFPs);
router.post('/getOtherRFPs', verifyUser(["company", "employee"]), getOtherRFPs);
router.get('/getSavedAndDraftRFPs', verifyUser(["company", "employee"]), getSavedAndDraftRFPs);

router.get('/getRecentAndSavedGrants', verifyUser(["company", "employee"]), getRecentAndSavedGrants);
router.post('/getOtherGrants', verifyUser(["company", "employee"]), getOtherGrants);
router.get('/getSavedAndDraftGrants', verifyUser(["company", "employee"]), getSavedAndDraftGrants);

router.post('/saveRFP', verifyUser(["company", "employee"]), saveRFP);
router.post('/unsaveRFP', verifyUser(["company", "employee"]), unsaveRFP);
router.post('/saveDraftRFP', verifyUser(["company", "employee"]), saveDraftRFP);

router.post('/saveGrant', verifyUser(["company", "Editor"]), saveGrant);
router.post('/unsaveGrant', verifyUser(["company", "Editor"]), unsaveGrant);
router.post('/saveDraftGrant', verifyUser(["company", "Editor"]), saveDraftGrant);
router.post('/unsaveDraftGrant', verifyUser(["company", "Editor"]), unsaveDraftGrant);

router.post('/sendDataForProposalGeneration', verifyUser(["company", "Editor"]), sendDataForProposalGeneration);
router.post('/triggerRFPDiscovery', verifyUser(["company", "employee"]), sendDataForRFPDiscovery);
router.post('/uploadRFP', verifyUser(["company", "employee"]), handleFileUploadAndSendForRFPExtraction);

router.post('/sendGrantDataForProposalGeneration', verifyUser(["company", "Editor"]), sendGrantDataForProposalGeneration);
router.post('/uploadGrant', verifyUser(["company", "employee"]), handleFileUploadAndSendForGrantExtraction);
router.post('/getGrantProposal', verifyUser(["company", "Editor"]), getGrantProposalStatus);

module.exports = router;
