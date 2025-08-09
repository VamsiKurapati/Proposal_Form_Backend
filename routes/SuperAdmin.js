const express = require('express');
const router = express.Router();


const { getNotificationData, getSupportStatsAndData, updateSupportTicket, createNotification, createSubscriptionPlan, getSubscriptionPlans, updateSubscriptionPlan, getSubscriptionData, getPaymentsSummaryAndData, getCompanyStatsAndData } = require('../controllers/superAdminController');

// router.get('/user_management/getstats', getStats);
// router.get('/user_management/getcomanyData', getCompanyData);
router.get('/getCompanyStatsAndData', getCompanyStatsAndData);


router.get('/getnotificationsData', getNotificationData);
router.post('/createNotification', createNotification);


router.get('/getsupportStatsAndData', getSupportStatsAndData);
router.put('/updateSupportTicket/:id', updateSupportTicket);



router.post('/createSubscriptionPlan', createSubscriptionPlan);
router.get('/getSubscriptionPlans', getSubscriptionPlans);
router.put('/updateSubscriptionPlan/:id', updateSubscriptionPlan);


//payment
router.get('/getPaymentStatsandData', getPaymentsSummaryAndData);
// router.get('/payment/getPaymentSummary', getPaymentSummary);


//subscription
router.get('/getSubscriptionData', getSubscriptionData);





module.exports = router;