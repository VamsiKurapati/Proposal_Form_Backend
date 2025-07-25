const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const EmployeeProfile = require("../models/EmployeeProfile");
const Proposal = require("../models/Proposal");

exports.getDashboardData = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        console.log(user);
        const role = user.role;
        console.log(role);
        if (role === "company") {
            console.log("Insidecompany");
            const companyProfile = await CompanyProfile.findOne({ user: user._id });
            console.log("Company Profile", companyProfile);
            const proposals = await Proposal.find({ companyId: companyProfile._id });
            console.log("Proposals", proposals);

            const totalProposals = proposals.length;
            const inProgressProposals = proposals.filter(proposal => proposal.status === "In Progress").length;
            const wonProposals = proposals.filter(proposal => proposal.status === "Won").length;
            const submittedProposals = proposals.filter(proposal => proposal.status === "Submitted").length;

            const deletedProposals = proposals.filter(proposal => proposal.isDeleted).map(proposal => ({
                ...proposal,
                restoreIn: Math.ceil((new Date(proposal.restoreBy).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + " days"
            }));

            const data = {
                totalProposals,
                inProgressProposals,
                submittedProposals,
                wonProposals,
                proposals,
                deletedProposals
            }

            res.status(200).json(data);
        } else if (role === "employee") {
            const employeeProfile = await EmployeeProfile.findOne({ user: user._id });
            const companyProfile = await CompanyProfile.findOne({ companyName: employeeProfile.companyName });

            const proposals = await Proposal.find({ companyId: companyProfile._id });
            const totalProposals = proposals.length;
            const inProgressProposals = proposals.filter(proposal => proposal.status === "In Progress").length;
            const submittedProposals = proposals.filter(proposal => proposal.status === "Submitted").length;
            const wonProposals = proposals.filter(proposal => proposal.status === "Won").length;

            const deletedProposals = proposals.filter(proposal => proposal.isDeleted).map(proposal => ({
                ...proposal,
                restoreIn: Math.ceil((new Date(proposal.restoreBy).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + " days"
            }));

            const data = {
                totalProposals,
                inProgressProposals,
                submittedProposals,
                wonProposals,
                proposals,
                deletedProposals
            }

            res.status(200).json(data);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.editProposalStatus = async (req, res) => {
    try {
        const { proposalId, status } = req.body;
        const proposal = await Proposal.findByIdAndUpdate(proposalId, { status }, { new: true });
        res.status(200).json(proposal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.setCurrentEditor = async (req, res) => {
    try {
        const { proposalId, editorId } = req.body;
        const proposal = await Proposal.findByIdAndUpdate(proposalId, { currentEditor: editorId }, { new: true });
        res.status(200).json({ message: "Editor set successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.restoreProposal = async (req, res) => {
    try {
        const { proposalId } = req.body;
        const proposal = await Proposal.findByIdAndUpdate(proposalId, { isDeleted: false, restoredBy: req.user._id, restoredAt: new Date() }, { new: true });
        res.status(200).json(proposal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteProposals = async (req, res) => {
    try {
        const { proposalIds } = req.body;
        const proposals = await Proposal.updateMany({ _id: { $in: proposalIds } }, { isDeleted: true, deletedBy: req.user._id, deletedAt: new Date(), restoreBy: new Date() + 15 * 24 * 60 * 60 * 1000 }); // 15 days
        res.status(200).json(proposals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deletePermanently = async (req, res) => {
    try {
        const { proposalId } = req.body;
        await Proposal.findByIdAndDelete(proposalId);
        res.status(200).json({ message: "Proposal deleted permanently" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};