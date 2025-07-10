//Profile.js
const express = require('express');
const router = express.Router();
const verifyUser = require('../utils/verifyUser.js');

const { updateCompanyProfile, addEmployee, addCaseStudy, addLicenseAndCertification } = require('../controllers/profileController.js');

router.put('/updateCompanyProfile', verifyUser, updateCompanyProfile);
router.post('/addEmployee', verifyUser, addEmployee);
router.post('/addCaseStudy', verifyUser, addCaseStudy);
router.post('/addLicenseAndCertification', verifyUser, addLicenseAndCertification);

module.exports = router;
