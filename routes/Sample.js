const express = require('express');
const router = express.Router();

const { getData, setData } = require('../controllers/sampleController');

router.get('/getData/:name', getData);
router.post('/sendData/:name', setData);

module.exports = router;