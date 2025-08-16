const express = require('express');
const router = express.Router();
const supportController = require('../controllers/SupportController');
const upload = require('../middleware/multerConfig'); // the above multer setup


router.post('/tickets', upload.array('attachments'), supportController.createTicket);
router.get('/tickets', supportController.getUserTickets);
router.put('/tickets/:id/reopen', supportController.reopenSupportTicket);
router.put('/tickets/:id/withdrawn', supportController.withdrawnSupportTicket);


module.exports = router;
