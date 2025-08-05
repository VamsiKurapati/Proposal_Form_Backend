const express = require('express');
const router = express.Router();

const { create, readAll, read, serve, update, delete_1, sendProposalPDF, uploadImage, getImage, basicComplianceCheck } = require('../controllers/proposalController');

router.post('/createProposal', create);
router.post('/', readAll);
router.get('/basicComplianceCheck', basicComplianceCheck);
router.get('/file/:id', serve);
router.get('/getProposal/:id', sendProposalPDF);
router.get('/getImage/:imageId', getImage);
router.get('/:id', read);
router.put('/:id', update);
router.delete('/:id', delete_1);
router.post('/uploadImage', uploadImage);

module.exports = router;