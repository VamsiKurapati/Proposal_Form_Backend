const express = require('express');
const router = express.Router();

const { getProfile, updateCompanyProfile } = require('../controllers/profileController');

router.get('/getProfile', getProfile);
router.put('/updateCompanyProfile', verifyToken, updateCompanyProfile);

module.exports = router;
// This file defines the routes for managing company profiles.
// It includes routes for creating, retrieving, updating, and deleting profiles.