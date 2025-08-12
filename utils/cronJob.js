const cron = require('node-cron');
const { deleteExpiredProposals } = require('../controllers/proposalController');


// Cron job to delete expired proposals every day at 12:00 AM server time
cron.schedule('0 0 * * *', async () => {
    await deleteExpiredProposals();
    console.log('Cron job completed.');
});