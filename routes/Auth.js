// authRoute.js
const express = require('express');
const router = express.Router();

const { login, signupWithProfile, logout } = require('../controllers/authcontroller.js');

router.post('/login', login);
router.post('/signup', signupWithProfile);
router.post('/logout', logout);

module.exports = router;
