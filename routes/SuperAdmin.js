const express = require('express');
const router = express.Router();
const verifyUser = require('../utils/verifyUser');

const { getNotificationData, getSupportStatsAndData, updateSupportTicket, getSubscriptionPlans, updateSubscriptionPlan, getSubscriptionData, getPaymentsSummaryAndData, getCompanyStatsAndData, updateCompanyStatus, addAdminMessage } = require('../controllers/superAdminController');


router.get('/getCompanyStatsAndData', verifyUser(["SuperAdmin"]), getCompanyStatsAndData);
router.put('/updateCompanyStatus/:id', verifyUser(["SuperAdmin"]), updateCompanyStatus);


router.get('/getnotificationsData', verifyUser(["SuperAdmin"]), getNotificationData);


router.get('/getsupportStatsAndData', verifyUser(["SuperAdmin"]), getSupportStatsAndData);
router.put('/updateSupportTicket/:id', verifyUser(["SuperAdmin"]), updateSupportTicket);
router.post('/addAdminMessage/:id', verifyUser(["SuperAdmin"]), addAdminMessage);



router.get('/getSubscriptionPlans', verifyUser(["SuperAdmin"]), getSubscriptionPlans);
router.put('/updateSubscriptionPlan/:id', verifyUser(["SuperAdmin"]), updateSubscriptionPlan);


//payment
router.get('/getPaymentStatsandData', verifyUser(["SuperAdmin"]), getPaymentsSummaryAndData);


//subscription
router.get('/getSubscriptionData', verifyUser(["SuperAdmin"]), getSubscriptionData);




module.exports = router;