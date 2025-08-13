const express = require('express');
const router = express.Router();
const supportController = require('../controllers/SupportController');
const upload = require('../middleware/multerConfig'); // the above multer setup

// Upload multiple files (max 1 files per ticket)
router.post('/ticket', upload.array('attachments', 1), supportController.createTicket);

// Get tickets by userId - supports both path parameter and query parameter
// router.get('/tickets/:userId', supportController.getUserTickets);
router.get('/tickets', supportController.getUserTicketsByQuery);

module.exports = router;
