//rfpDiscoveryMLModel.js
const express = require('express');
const router = express.Router();
const verifyUser = require('../utils/verifyUser');

const {getUsersData, matchedRFPData, getAllRFP, save, unsave, getUserandRFPData } = require('../controllers/rfpDiscoveryMLModelController');

router.get('/getUsersData', getUsersData);
router.post('/matchedRFPdata', matchedRFPData);
router.get('/getAllRFP', verifyUser, getAllRFP);
router.post('/saveRFP', verifyUser, save);
router.post('/unsaveRFP', verifyUser, unsave);

router.get('/getUserandRFPData', getUserandRFPData);

module.exports = router;
