const express = require('express');
const router = express.Router();

const { getData, setData, deleteData } = require('../controllers/sampleController');

router.get('/getData/:name', getData);
router.post('/sendData/:name', setData);
router.delete('/deleteData/:name', deleteData);

module.exports = router;