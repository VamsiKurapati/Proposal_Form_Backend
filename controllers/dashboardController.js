const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const EmployeeProfile = require("../models/EmployeeProfile");
const Proposal = require("../models/Proposal");
const CalendarEvent = require("../models/CalendarEvents");

exports.getDashboardData = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        console.log(user);
        const role = user.role;
        console.log(role);
        if (role === "company") {
            console.log("Insidecompany");
            const companyProfile = await CompanyProfile.findOne({ userId: user._id });
            console.log("Company Profile", companyProfile);
            const proposals = await Proposal.find({ companyMail: companyProfile.email }).populate('currentEditor', '_id fullName email').sort({ createdAt: -1 });
            console.log("Proposals", proposals);

            const totalProposals = proposals.length;
            const inProgressProposals = proposals.filter(proposal => proposal.status === "In Progress").length;
            const wonProposals = proposals.filter(proposal => proposal.status === "Won").length;
            const submittedProposals = proposals.filter(proposal => proposal.status === "Submitted").length;

            const notDeletedProposals = proposals.filter(proposal => !proposal.isDeleted);

            const deletedProposals = proposals.filter(proposal => proposal.isDeleted).map(proposal => {
                const proposalObj = proposal.toObject();
                return {
                    ...proposalObj,
                    restoreIn: (() => {
                        if (!proposal.restoreBy) return "No restore date";

                        const now = new Date();
                        const restoreDate = new Date(proposal.restoreBy);

                        if (isNaN(restoreDate.getTime())) return "Invalid restore date";

                        const diffTime = restoreDate.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays <= 0) {
                            return "Available for restoration";
                        } else if (diffDays === 1) {
                            return "1 day";
                        } else {
                            return `${diffDays} days`;
                        }
                    })()
                };
            });

            const calendarEvents = await CalendarEvent.find({ companyId: companyProfile._id });

            const employees = companyProfile.employees || [];

            const data = {
                totalProposals,
                inProgressProposals,
                submittedProposals,
                wonProposals,
                proposals: notDeletedProposals,
                deletedProposals,
                calendarEvents,
                employees,
            };

            res.status(200).json(data);
        } else if (role === "employee") {
            console.log("Insideemployee");
            const employeeProfile = await EmployeeProfile.findOne({ userId: user._id });
            if (!employeeProfile) {
                return res.status(404).json({ message: "Employee profile not found" });
            }
            console.log("Employee Profile", employeeProfile);
            const companyProfile = await CompanyProfile.findOne({ email: employeeProfile.companyMail });
            if (!companyProfile) {
                return res.status(404).json({ message: "Company profile not found" });
            }
            console.log("Company Profile", companyProfile);
            const proposals = await Proposal.find({ email: employeeProfile.companyMail });
            const totalProposals = proposals.length;
            const inProgressProposals = proposals.filter(proposal => proposal.status === "In Progress").length;
            const submittedProposals = proposals.filter(proposal => proposal.status === "Submitted").length;
            const wonProposals = proposals.filter(proposal => proposal.status === "Won").length;

            const notDeletedProposals = proposals.filter(proposal => !proposal.isDeleted);

            const deletedProposals = proposals.filter(proposal => proposal.isDeleted).map(proposal => {
                const proposalObj = proposal.toObject();
                return {
                    ...proposalObj,
                    restoreIn: (() => {
                        if (!proposal.restoreBy) return "No restore date";

                        const now = new Date();
                        const restoreDate = new Date(proposal.restoreBy);

                        if (isNaN(restoreDate.getTime())) return "Invalid restore date";

                        const diffTime = restoreDate.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays <= 0) {
                            return "Available for restoration";
                        } else if (diffDays === 1) {
                            return "1 day";
                        } else {
                            return `${diffDays} days`;
                        }
                    })()
                };
            });

            const calendarEvents = await CalendarEvent.find({
                $or: [
                    { companyId: companyProfile._id },
                    { employeeId: employeeProfile._id }
                ]
            });

            const employees = companyProfile.employees || [];

            const data = {
                totalProposals,
                inProgressProposals,
                submittedProposals,
                wonProposals,
                proposals: notDeletedProposals,
                deletedProposals,
                calendarEvents,
                employees,
            };

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

exports.addCalendarEvent = async (req, res) => {
    try {
        const { title, start, end } = req.body;

        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!title || !start || !end) {
            return res.status(400).json({ message: "Title, start date, and end date are required" });
        }

        //console.log("User Data:", user);

        if (user.role === "company") {
            const companyProfile = await CompanyProfile.findOne({ userId });
            if (!companyProfile) {
                return res.status(404).json({ message: "Company profile not found" });
            }
            const calendarEvent = new CalendarEvent({
                companyId: companyProfile._id,
                employeeId: companyProfile._id,
                title,
                startDate: start,
                endDate: end,
                status: "Deadline"
            });
            await calendarEvent.save();
            res.status(201).json(calendarEvent);
        } else if (user.role === "employee") {
            const employeeProfile = await EmployeeProfile.findOne({ user: userId });
            if (!employeeProfile) {
                return res.status(404).json({ message: "Employee profile not found" });
            }
            const companyProfile = await CompanyProfile.findOne({ email: employeeProfile.companyMail });
            const calendarEvent = new CalendarEvent({
                companyId: companyProfile._id,
                employeeId: employeeProfile._id,
                title,
                startDate: start,
                endDate: end,
                status: "Deadline"
            });
            await calendarEvent.save();
            res.status(201).json(calendarEvent);
        } else {
            return res.status(400).json({ message: "Invalid user role" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.setCurrentEditor = async (req, res) => {
    try {
        const { proposalId, editorId } = req.body;

        if (!proposalId || !editorId) {
            return res.status(400).json({ message: "Proposal ID and Editor ID are required" });
        }

        const editor = await EmployeeProfile.findById(editorId);
        if (!editor) {
            return res.status(404).json({ message: "Editor not found" });
        }

        const userId = editor.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const proposal = await Proposal.findById(proposalId);
        if (!proposal) {
            return res.status(404).json({ message: "Proposal not found" });
        }

        proposal.currentEditor = user._id;
        await proposal.save();

        res.status(200).json({ message: "Editor set successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.restoreProposal = async (req, res) => {
    try {
        const { proposalId } = req.body;
        const proposal = await Proposal.findByIdAndUpdate(proposalId, { isDeleted: false, deletedBy: null, deletedAt: null, restoreBy: null, restoredBy: req.user._id, restoredAt: new Date() }, { new: true });
        res.status(200).json(proposal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteProposals = async (req, res) => {
    try {
        const { proposalIds } = req.body;
        const proposals = await Proposal.updateMany({ _id: { $in: proposalIds } }, {
            isDeleted: true,
            deletedBy: req.user._id,
            deletedAt: new Date(),
            restoreBy: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        }); // 15 days
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

exports.updateProposal = async (req, res) => {
    try {
        const { proposalId, updates } = req.body;
        const proposal = await Proposal.findById(proposalId);
        if (!proposal) {
            return res.status(404).json({ message: "Proposal not found" });
        }
        console.log("Updates", updates);
        proposal.deadline = updates.deadline;
        proposal.submittedAt = updates.submittedAt;
        proposal.status = updates.status;
        await proposal.save();
        res.status(200).json(proposal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};