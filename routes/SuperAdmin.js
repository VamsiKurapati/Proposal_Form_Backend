const express = require('express');
const router = express.Router();
const verifyUser = require('../utils/verifyUser');

const { getNotificationData, getSupportStatsAndData, updateSupportTicket, createNotification, createSubscriptionPlan, getSubscriptionPlans, updateSubscriptionPlan, getSubscriptionData, getPaymentsSummaryAndData, getCompanyStatsAndData, updatePaymentStatus, updateCompanyStatus } = require('../controllers/superAdminController');

// router.get('/user_management/getstats', getStats);
// router.get('/user_management/getcomanyData', getCompanyData);
router.get('/getCompanyStatsAndData', verifyUser["SuperAdmin"], getCompanyStatsAndData);
router.put('/updateCompanyStatus/:id', verifyUser["SuperAdmin"], updateCompanyStatus);


router.get('/getnotificationsData', verifyUser["SuperAdmin"], getNotificationData);
// router.post('/createNotification', verifyUser["SuperAdmin"], createNotification);


router.get('/getsupportStatsAndData', verifyUser["SuperAdmin"], getSupportStatsAndData);
router.put('/updateSupportTicket/:id', verifyUser["SuperAdmin"], updateSupportTicket);



router.post('/createSubscriptionPlan', verifyUser["SuperAdmin"], createSubscriptionPlan);
router.get('/getSubscriptionPlans', verifyUser["SuperAdmin"], getSubscriptionPlans);
router.put('/updateSubscriptionPlan/:id', verifyUser["SuperAdmin"], updateSubscriptionPlan);


//payment
router.get('/getPaymentStatsandData', verifyUser["SuperAdmin"], getPaymentsSummaryAndData);
router.put('/updatePaymentStatus/:id', verifyUser["SuperAdmin"], updatePaymentStatus);
// router.get('/payment/getPaymentSummary', getPaymentSummary);


//subscription
router.get('/getSubscriptionData', verifyUser["SuperAdmin"], getSubscriptionData);


module.exports = router;