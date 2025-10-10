const cron = require('node-cron');
const { deleteExpiredProposals, fetchGrants, priorityCronJob, fetchRFPs, deleteExpiredGrantProposals, fetchRefundPayments, updateSubscriptionStatus } = require('../controllers/cronJobControllers');

// Cron job to delete expired proposals every day at 12:00 AM server time
cron.schedule('0 0 * * *', async () => {
  await deleteExpiredProposals();

  await deleteExpiredGrantProposals();
});

// Cron job to fetch grants every day at 05:00 AM server time
cron.schedule('0 5 * * *', async () => {
  await fetchGrants();
});


// Cron job to fetch RFPs from the RFP API every day at 06:00 AM server time
cron.schedule('0 6 * * *', async () => {
  await fetchRFPs();
});

// Cron job to fetch refund payments every day at 07:00 AM server time
cron.schedule('0 7 * * *', async () => {
  await fetchRefundPayments();
});

// Cron job to update the priority of the support tickets every hour
cron.schedule('0 * * * *', async () => {
  await priorityCronJob();
});

// Cron job to update the subscription status every hour
cron.schedule('0 * * * *', async () => {
  await updateSubscriptionStatus();
});