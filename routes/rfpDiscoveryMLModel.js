//rfpDiscoveryMLModel.js
const express = require('express');
const router = express.Router();
const verifyUser = require('../utils/verifyUser');

const {getUsersData, matchedRFPData, getAllRFP, save, unsave } = require('../controllers/rfpDiscoveryMLModelController');

router.get('/getUsersData', verifyUser, getUsersData);
router.post('/matchedRFPdata', verifyUser, matchedRFPData);
router.get('/getAllRFP', verifyUser, getAllRFP);
router.post('/saveRFP', verifyUser, save);
router.post('/unsaveRFP', verifyUser, unsave);

module.exports = router;
