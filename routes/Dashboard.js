const express = require("express");
const router = express.Router();

const { verifyUser } = require("../utils/verifyUser");

const { getDashboardData, editProposalStatus, restoreProposal, deleteProposals } = require("../controllers/dashboardController");

router.get("/getDashboardData", verifyUser(["company", "editor", "viewer"]), getDashboardData);
router.put("/editProposalStatus", verifyUser(["company", "editor"]), editProposalStatus);
router.put("/restoreProposal", verifyUser(["company", "editor"]), restoreProposal);
router.put("/deleteProposals", verifyUser(["company", "editor"]), deleteProposals);

module.exports = router;