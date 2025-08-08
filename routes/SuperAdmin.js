const express = require('express');
const router = express.Router();


const {getNotificationData, getSupportStatsAndData, updateSupportTicket, createNotification, createSubscriptionPlan, getSubscriptionPlans, updateSubscriptionPlan, getSubscriptionData, getPaymentsSummaryAndData, getCompanyStatsAndData } = require('../controllers/superAdminController');

// router.get('/user_management/getstats', getStats);
// router.get('/user_management/getcomanyData', getCompanyData);
router.get('/user_management/getCompanyStatsAndData', getCompanyStatsAndData);


router.get('/notification/getnotificationData', getNotificationData);
router.post('/notification/createNotification', createNotification);


router.get('/support/getsupportStatsAndData', getSupportStatsAndData);
router.put('/support/updateSupportTicket/:id', updateSupportTicket);



router.post('/subscription/createSubscriptionPlan', createSubscriptionPlan);
router.get('/subscription/getSubscriptionPlans', getSubscriptionPlans);
router.put('/subscription/updateSubscriptionPlan/:id', updateSubscriptionPlan);


//payment
router.get('/payment/getPaymentStatandData', getPaymentsSummaryAndData);
// router.get('/payment/getPaymentSummary', getPaymentSummary);


//subscription
router.get('/subscription/getSubscriptionData', getSubscriptionData);





module.exports = router;