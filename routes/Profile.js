//Profile.js
const express = require('express');
const router = express.Router();

const verifyUser = require('../utils/verifyUser');

const { getProfile, getEmployeeProfile, updateCompanyProfile, updateEmployeeProfile, addEmployee, addCaseStudy, addLicenseAndCertification, uploadLogo, getProfileImage, getCaseStudy, addDocument, getDocument, getProposals } = require('../controllers/profileController.js');

router.get('/getProfile', verifyUser(["company", "employee"]), getProfile);
router.get('/getEmployeeProfile', verifyUser(["employee"]), getEmployeeProfile);
router.put('/updateCompanyProfile', verifyUser(["company"]), updateCompanyProfile);
router.get('/getProposals', verifyUser(["company", "employee"]), getProposals);
router.put('/updateEmployeeProfile', verifyUser(["employee"]), updateEmployeeProfile);
router.post('/addEmployee', verifyUser(["company"]), addEmployee);
router.post('/addCaseStudy', verifyUser(["company"]), addCaseStudy);
router.post('/addLicenseAndCertification', verifyUser(["company"]), addLicenseAndCertification);
router.post('/uploadLogo', verifyUser(["company", "employee"]), uploadLogo);
router.post('/addDocument', verifyUser(["company"]), addDocument);
router.get('/getProfileImage/file/:id', getProfileImage);
router.get('/getCaseStudy/:id', getCaseStudy);
router.get('/getDocument/:id', getDocument);

module.exports = router;
