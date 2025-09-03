const express = require('express');
const router = express.Router();
const verifyUser = require('../utils/verifyUser');

const { getCompanyStatsAndData,
     updateCompanyStatus,
      getNotificationData,
       getSupportStatsAndData,
        updateSupportTicket,
         addAdminMessage, 
         getSubscriptionPlansData, 
         updateSubscriptionPlanPrice, 
         getPaymentsSummaryAndData, 
         updateSubscriptionPlanIsContact, 
         sendEmail,
          getCustomPlanData,
           deleteCustomPlan,
           createCustomPlan
 } = require('../controllers/superAdminController');

router.get('/getCompanyStatsAndData', verifyUser(["SuperAdmin"]), getCompanyStatsAndData);
router.put('/updateCompanyStatus/:id', verifyUser(["SuperAdmin"]), updateCompanyStatus);


router.get('/getnotificationsData', verifyUser(["SuperAdmin"]), getNotificationData);


router.get('/getsupportStatsAndData', verifyUser(["SuperAdmin"]), getSupportStatsAndData);
router.put('/updateSupportTicket/:id', verifyUser(["SuperAdmin"]), updateSupportTicket);
router.post('/addAdminMessage/:id', verifyUser(["SuperAdmin"]), addAdminMessage);


router.get('/getSubscriptionPlansData', verifyUser(["SuperAdmin"]), getSubscriptionPlansData);
router.put('/updateSubscriptionPlanPrice/:id', verifyUser(["SuperAdmin"]), updateSubscriptionPlanPrice);
router.put('/updateSubscriptionPlanIsContact/:id', verifyUser(["SuperAdmin"]), updateSubscriptionPlanIsContact);
router.post('/updateSubscriptionPlanCustom', verifyUser(["SuperAdmin"]), sendEmail);


//payment
router.get('/getPaymentStatsAndData', verifyUser(["SuperAdmin"]), getPaymentsSummaryAndData);

//custom plan
router.get('/getCustomPlanData', verifyUser(["SuperAdmin"]), getCustomPlanData);
router.delete('/deleteCustomPlan/:id', verifyUser(["SuperAdmin"]), deleteCustomPlan);
router.post('/createCustomPlan', verifyUser(["SuperAdmin"]), createCustomPlan);

module.exports = router;