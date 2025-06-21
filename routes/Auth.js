// authRoute.js
const express = require('express');
const router = express.Router();

const { signup, login } = require('../controllers/authcontroller.js');

router.post('/login', login);
router.post('/signup', signup);

module.exports = router;
