const cron = require('node-cron');
const { deleteExpiredProposals } = require('../controllers/proposalController');
const { triggerGrant } = require('../controllers/mlPipelineController');
const { priorityCronJob } = require('../controllers/superAdminController');



// Cron job to delete expired proposals every day at 12:00 AM server time
cron.schedule('0 0 * * *', async () => {
  //   console.log('Starting cron job to delete expired proposals...');
  await deleteExpiredProposals();
  // console.log("Triggering grant");
  await triggerGrant();
});

// Cron job to update the priority of the support tickets every hour
cron.schedule('0 * * * *', async () => {
  await priorityCronJob();
  //console.log('Priority updated successfully.');
});

