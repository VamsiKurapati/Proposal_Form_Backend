const cron = require('node-cron');
const { deleteExpiredProposals, fetchGrants, priorityCronJob, fetchRFPs, deleteExpiredGrantProposals, fetchRefundPayments, updateSubscriptionStatus } = require('../controllers/cronJobControllers');

// Run the cron job only in instance 0
if (process.env.NODE_APP_INSTANCE === '0') {
  // Cron job to delete expired proposals every day at 12:00 AM server time
  cron.schedule('0 0 * * *', async () => {
    try {
      await deleteExpiredProposals();
    } catch (error) {
      console.error('Error deleting expired proposals:', error);
    }

    try {
      await deleteExpiredGrantProposals();
    } catch (error) {
      console.error('Error deleting expired grant proposals:', error);
    }
  });

  // Cron job to fetch grants every day at 05:00 AM server time
  cron.schedule('0 5 * * *', async () => {
    try {
      await fetchGrants();
    } catch (error) {
      console.error('Error fetching grants:', error);
    }
  });


  // Cron job to fetch RFPs from the RFP API every day at 06:00 AM server time
  cron.schedule('0 6 * * *', async () => {
    try {
      await fetchRFPs();
    } catch (error) {
      console.error('Error fetching RFPs:', error);
    }
  });

  // Cron job to fetch refund payments every day at 07:00 AM server time
  cron.schedule('0 7 * * *', async () => {
    try {
      await fetchRefundPayments();
    } catch (error) {
      console.error('Error fetching refund payments:', error);
    }
  });

  // Cron job to update the priority of the support tickets every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await priorityCronJob();
    } catch (error) {
      console.error('Error updating priority of support tickets:', error);
    }
  });

  // Cron job to update the subscription status every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await updateSubscriptionStatus();
    } catch (error) {
      console.error('Error updating subscription status:', error);
    }
  });
}