const express = require("express");
const router = express.Router();

const verifyUser = require("../utils/verifyUser");

const { getDashboardData, editProposalStatus, addCalendarEvent, restoreProposal, deleteProposals, setCurrentEditor, deletePermanently, updateProposal } = require("../controllers/dashboardController");

router.get("/getDashboardData", verifyUser(["company", "employee"]), getDashboardData);
router.put("/editProposalStatus", verifyUser(["company", "Editor"]), editProposalStatus);
router.post("/addCalendarEvent", verifyUser(["company", "Editor"]), addCalendarEvent);
router.put("/setCurrentEditor", verifyUser(["company", "Editor"]), setCurrentEditor);
router.put("/restoreProposal", verifyUser(["company", "Editor"]), restoreProposal);
router.put("/deleteProposals", verifyUser(["company", "Editor"]), deleteProposals);
router.put("/deletePermanently", verifyUser(["company", "Editor"]), deletePermanently);
router.put("/updateProposal", verifyUser(["company", "Editor"]), updateProposal);

module.exports = router;