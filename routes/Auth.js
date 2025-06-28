// authRoute.js
const express = require('express');
const router = express.Router();

const { signup, login, signupWithProfile } = require('../controllers/authcontroller.js');

router.post('/login', login);
// router.post('/signup', signup);
router.post('/signup', signupWithProfile);

module.exports = router;
