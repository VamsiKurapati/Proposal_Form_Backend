const express = require('express');
const router = express.Router();


const { getStats, getCompanyData, getNotificationData, getSupportTypeCounts, getAllSupportTickets, updateSupportTicket } = require('../controllers/superAdminController');
router.get('/user_management/getstats', getStats);
router.get('/user_management/getcomanyData', getCompanyData);


router.get('/notification/getnotificationData', getNotificationData);


router.get('/support/getsupportStats', getSupportTypeCounts);
router.get('/support/getsupportData', getAllSupportTickets);
router.put('/support/updateSupportTicket/:id', updateSupportTicket);





module.exports = router;