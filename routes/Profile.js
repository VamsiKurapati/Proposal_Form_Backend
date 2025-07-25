//Profile.js
const express = require('express');
const router = express.Router();

const verifyUser = require('../utils/verifyUser');

const { getProfile, updateCompanyProfile, addEmployee, addCaseStudy, addLicenseAndCertification, uploadLogo, getProfileImage, getCaseStudy, addDocument, getDocument } = require('../controllers/profileController.js');

router.get('/getProfile', verifyUser(["company", "editor", "viewer"]), getProfile);
router.put('/updateCompanyProfile', verifyUser(["company"]), updateCompanyProfile);
router.post('/addEmployee', verifyUser(["company"]), addEmployee);
router.post('/addCaseStudy', verifyUser(["company"]), addCaseStudy);
router.post('/addLicenseAndCertification', verifyUser(["company"]), addLicenseAndCertification);
router.post('/uploadLogo', verifyUser(["company", "editor", "viewer"]), uploadLogo);
router.post('/addDocument', verifyUser(["company"]), addDocument);
router.get('/getProfileImage/file/:id', getProfileImage);
router.get('/getCaseStudy/:id', getCaseStudy);
router.get('/getDocument/:id', getDocument);

module.exports = router;
