//Profile.js
const express = require('express');
const router = express.Router();
const verifyUser = require('../utils/verifyUser.js');

const { getProfile, updateCompanyProfile, addEmployee, addCaseStudy, addLicenseAndCertification, uploadLogo } = require('../controllers/profileController.js');

router.get('/getProfile', verifyUser, getProfile);
router.put('/updateCompanyProfile', verifyUser, updateCompanyProfile);
router.post('/addEmployee', verifyUser, addEmployee);
router.post('/addCaseStudy', verifyUser, addCaseStudy);
router.post('/addLicenseAndCertification', verifyUser, addLicenseAndCertification);
router.post('/uploadLogo', verifyUser, uploadLogo);

module.exports = router;
