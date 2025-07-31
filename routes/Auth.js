// authRoute.js
const express = require('express');
const router = express.Router();

const { login, signupWithProfile } = require('../controllers/authcontroller.js');

router.post('/login', login);
router.post('/signup', signupWithProfile);

module.exports = router;
