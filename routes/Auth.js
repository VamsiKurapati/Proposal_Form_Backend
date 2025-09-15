// authRoute.js
const express = require('express');
const router = express.Router();

const { login, signupWithProfile, logout, forgotPassword, resetPassword } = require('../controllers/authcontroller.js');

router.post('/login', login);
router.post('/signup', signupWithProfile);
router.post('/logout', logout);
router.post('/forgotPassword', forgotPassword);
router.post('/resetPassword', resetPassword);

module.exports = router;
