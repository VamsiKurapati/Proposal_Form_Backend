const express = require('express');
const router = express.Router();
const { verifyToken } = require('../utils/verifyUser.js');


const { getProfile, updateCompanyProfile } = require('../controllers/profileController');

router.get('/getProfile', verifyToken, getProfile);
router.put('/updateCompanyProfile', verifyToken, updateCompanyProfile);
router.post('/addEmployee', verifyToken, addEmployee);
router.post('/addCaseStudy', verifyToken, addCaseStudy);
router.post('/addLicenseAndCertification', verifyToken, addLicenseAndCertification);

module.exports = router;
// This file defines the routes for managing company profiles.
// It includes routes for creating, retrieving, updating, and deleting profiles.