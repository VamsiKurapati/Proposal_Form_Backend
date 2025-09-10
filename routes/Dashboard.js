const express = require("express");
const router = express.Router();

const verifyUser = require("../utils/verifyUser");

const { getDashboardData, addCalendarEvent, restoreProposal, deleteProposals, setCurrentEditor, deletePermanently, updateProposal, setCurrentEditorGrant, restoreGrantProposal, deleteGrantProposals, deletePermanentlyGrant, updateGrantProposal } = require("../controllers/dashboardController");

router.get("/getDashboardData", verifyUser(["company", "employee"]), getDashboardData);
// router.put("/editProposalStatus", verifyUser(["company", "Editor"]), editProposalStatus);
router.post("/addCalendarEvent", verifyUser(["company", "Editor"]), addCalendarEvent);
router.put("/setCurrentEditor", verifyUser(["company", "Editor"]), setCurrentEditor);
router.put("/restoreProposal", verifyUser(["company", "Editor"]), restoreProposal);
router.put("/deleteProposals", verifyUser(["company", "Editor"]), deleteProposals);
router.put("/deletePermanently", verifyUser(["company", "Editor"]), deletePermanently);
router.put("/updateProposal", verifyUser(["company", "Editor"]), updateProposal);

// router.put("/editGrantProposalStatus", verifyUser(["company", "Editor"]), editGrantProposalStatus);
router.put("/setGrantCurrentEditor", verifyUser(["company", "Editor"]), setCurrentEditorGrant);
router.put("/restoreGrantProposal", verifyUser(["company", "Editor"]), restoreGrantProposal);
router.put("/deleteGrantProposals", verifyUser(["company", "Editor"]), deleteGrantProposals);
router.put("/deleteGrantPermanently", verifyUser(["company", "Editor"]), deletePermanentlyGrant);
router.put("/updateGrantProposal", verifyUser(["company", "Editor"]), updateGrantProposal);


module.exports = router;