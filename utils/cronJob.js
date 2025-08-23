const cron = require('node-cron');
const { deleteExpiredProposals } = require('../controllers/proposalController');
const { triggerGrant } = require('../controllers/mlPipelineController');



// Cron job to delete expired proposals every day at 2:00 AM server time
cron.schedule('0 0 * * *', async () => {
  //   console.log('Starting cron job to delete expired proposals...');
  await deleteExpiredProposals();
  // console.log("Triggering grant");
  await triggerGrant();
  console.log('Cron job completed.');
});

