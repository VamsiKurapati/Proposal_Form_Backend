const express = require('express');
const router = express.Router();

const { create, readAll, read, serve, update, delete_1, sendProposalPDF } = require('../controllers/proposalController');

router.post('/createProposal', create);
router.post('/', readAll);
router.get('/:id', read);
router.get('/file/:id', serve);
router.put('/:id', update);
router.delete('/:id', delete_1);
router.get('/getProposal/:id', sendProposalPDF);

module.exports = router;