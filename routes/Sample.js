const express = require('express');
const router = express.Router();

const { getData, setData } = require('../controllers/sampleController');

router.get('/getData', getData);
router.post('/sendData', setData);

module.exports = router;