const axios = require('axios');
const Grant = require('../models/Grant');
const Support = require('../models/Support');
const RFP = require('../models/RFP');
const DraftRFP = require('../models/DraftRFP');
const Proposal = require('../models/Proposal');
const ProposalTracker = require('../models/ProposalTracker');
const GrantProposal = require('../models/GrantProposal');
const DraftGrant = require('../models/DraftGrant');


exports.triggerGrant = async () => {
    try {
        const grants = await axios.get(`${process.env.PIPELINE_URL}/grants/trigger`);
        const grant_data = await Grant.insertMany(grants);
        return { message: "Grants triggered successfully", grant_data: grant_data };
    } catch (err) {
        console.error('Error in /triggerGrant:', err);
        return { error: 'Failed to trigger grants' };
    }
};

// Priority Cron Job
exports.priorityCronJob = async () => {
    try {
        //Get all support tickets and update the priority of the ticket to "Medium" if ticket.createdAt is more than 1 day and "High" if ticket.createdAt is more than 48 hours
        const supportTickets = await Support.find().sort({ createdAt: -1 });

        await Promise.all(
            supportTickets.map(async ticket => {
                const createdAt = new Date(ticket.createdAt);
                const now = new Date();
                const diffTime = Math.abs(now - createdAt);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let priority;
                if (diffDays > 2) {
                    priority = "Low";
                } else if (diffDays > 1) {
                    priority = "Medium";
                } else {
                    priority = "High";
                }

                // Only update if priority has changed
                if (ticket.priority !== priority) {
                    ticket.priority = priority;
                    await ticket.save();
                }
            })
        );

        return { message: "Priority updated successfully" };

    } catch (err) {
        console.error('Error in priorityCronJob:', err);
        return { message: "Error updating priority", error: err.message };
    }
};

// Service to delete expired proposals and their associated files from GridFS
exports.deleteExpiredProposals = async () => {

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today

        // Find all proposals where restore_by is less than today and isDeleted is true
        const expiredProposals = await Proposal.find({
            isDeleted: true,
            $and: [
                { restoreBy: { $lt: today } },
                { restoreBy: { $ne: null } }
            ]
        });

        if (expiredProposals.length === 0) {
            return { message: "No expired proposals found" };
        }


        // Delete each expired proposal and its associated files
        await Promise.all(expiredProposals.map(async (proposal) => {
            try {
                // Delete the proposal from database
                await Proposal.deleteOne({ _id: proposal._id });

                // Also delete the draft RFP
                await DraftRFP.deleteOne({ proposalId: proposal._id });

                // Also delete the proposal tracker
                await ProposalTracker.deleteOne({ proposalId: proposal._id });

            } catch (err) {
                console.error(`Failed to delete proposal ${proposal._id}:`, err.message);
            }
        }));
    } catch (error) {
        console.error('Error in deleteExpiredProposals service:', error);
        return { message: "Error deleting expired proposals", error: error.message };
    }
};

exports.deleteExpiredGrantProposals = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today

        // Find all grant proposals where restore_by is less than today and isDeleted is true
        const expiredGrantProposals = await GrantProposal.find({
            isDeleted: true,
            $and: [
                { restoreBy: { $lt: today } },
                { restoreBy: { $ne: null } }
            ]
        });

        if (expiredGrantProposals.length === 0) {
            return { message: "No expired grant proposals found" };
        }

        // Delete each expired grant proposal and its associated files
        await Promise.all(expiredGrantProposals.map(async (grantProposal) => {
            try {
                // Delete the grant proposal from database
                await GrantProposal.deleteOne({ _id: grantProposal._id });

                // Also delete the draft grant proposal
                await DraftGrant.deleteOne({ grantProposalId: grantProposal._id });
                // Also delete the proposal tracker
                await ProposalTracker.deleteOne({ grantProposalId: grantProposal._id });
            } catch (err) {
                console.error(`Failed to delete grant proposal ${grantProposal._id}:`, err.message);
            }
        }));

        return { message: "Expired grant proposals deleted successfully" };
    } catch (error) {
        console.error('Error in deleteExpiredGrantProposals service:', error);
        return { message: "Error deleting expired grant proposals", error: error.message };
    }
};

exports.fetchRFPs = async () => {
    try {
        //Fetch RFPs from the RFP API and save them to the database
        const rfp = await axios.get(`${process.env.PIPELINE_URL}/rfp/trigger`);

        //Check if the RFPs are already in the database and if not then save them else update them
        for (const rfp of rfp.data.rfps) {
            const existingRFP = await RFP.findOne({ title: rfp.title });
            if (existingRFP) {
                await RFP.findByIdAndUpdate(existingRFP._id, rfp);
            } else {
                await RFP.create(rfp);
            }
        }
        return { message: "RFPs fetched successfully" };
    } catch (err) {
        console.error('Error in fetchRFPs service:', err);
        return { message: "Error fetching RFPs", error: err.message };
    }
};
