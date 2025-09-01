const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const jwt = require('jsonwebtoken');

// Simple token verification middleware
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Missing or malformed token'
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Token is empty or incorrect'
            });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: Invalid token'
                });
            }

            req.user = decoded.user;
            next();
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// Apply authentication middleware to all routes
router.use(verifyToken);

// Payment Intent Routes
router.post('/create-payment-intent', stripeController.createPaymentIntent);

// Subscription Management Routes
router.post('/activate-subscription', stripeController.activateSubscription);

// Auto Renewal Management Routes
router.post('/enable-auto-renewal', stripeController.enableAutoRenewal);
router.post('/cancel-auto-renewal', stripeController.cancelAutoRenewal);

// Stripe Checkout for auto-renewing subscriptions
router.post('/create-checkout-session', stripeController.createCheckoutSession);

module.exports = router; 