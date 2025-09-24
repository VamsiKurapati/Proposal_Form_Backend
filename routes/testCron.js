const express = require("express");
const router = express.Router();

const { fetchRFPs, fetchGrants, priorityCronJob, deleteExpiredProposals, deleteExpiredGrantProposals } = require("../controllers/cronJobControllers");

// Test Cron Jobs
router.get("/fetchRFPs", fetchRFPs);
router.get("/fetchGrants", fetchGrants);
router.get("/priorityCronJob", priorityCronJob);
router.get("/deleteExpiredProposals", deleteExpiredProposals);
router.get("/deleteExpiredGrantProposals", deleteExpiredGrantProposals);

module.exports = router;