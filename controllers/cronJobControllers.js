const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const Grant = require('../models/Grant');
const Support = require('../models/Support');
const RFP = require('../models/RFP');
const DraftRFP = require('../models/DraftRFP');
const Proposal = require('../models/Proposal');
const ProposalTracker = require('../models/ProposalTracker');
const GrantProposal = require('../models/GrantProposal');
const DraftGrant = require('../models/DraftGrant');

//Trigger Grant Cron Job to fetch Grants from the Grant API and save them to the database
exports.fetchGrants = async () => {
    try {
        const grants = await axios.get(`${process.env.PIPELINE_URL}/grants/getgrants`);
        await Promise.all(grants.map(async (grant) => {
            //check if the grant is already in the database
            const existingGrant = await Grant.findOne({ OPPORTUNITY_NUMBER: grant.OPPORTUNITY_NUMBER });
            if (existingGrant) {
                await Grant.findByIdAndUpdate(existingGrant._id, {
                    OPPORTUNITY_ID: grant.OPPORTUNITY_ID || existingGrant.OPPORTUNITY_ID,
                    OPPORTUNITY_NUMBER_LINK: grant.OPPORTUNITY_NUMBER_LINK || existingGrant.OPPORTUNITY_NUMBER_LINK,
                    OPPORTUNITY_TITLE: grant.OPPORTUNITY_TITLE || existingGrant.OPPORTUNITY_TITLE,
                    AGENCY_CODE: grant.AGENCY_CODE || existingGrant.AGENCY_CODE,
                    AGENCY_NAME: grant.AGENCY_NAME || existingGrant.AGENCY_NAME,
                    CATEGORY_OF_FUNDING_ACTIVITY: grant.CATEGORY_OF_FUNDING_ACTIVITY || existingGrant.CATEGORY_OF_FUNDING_ACTIVITY,
                    FUNDING_CATEGORY_EXPLANATION: grant.FUNDING_CATEGORY_EXPLANATION || existingGrant.FUNDING_CATEGORY_EXPLANATION,
                    FUNDING_INSTRUMENT_TYPE: grant.FUNDING_INSTRUMENT_TYPE || existingGrant.FUNDING_INSTRUMENT_TYPE,
                    ASSISTANCE_LISTINGS: grant.ASSISTANCE_LISTINGS || existingGrant.ASSISTANCE_LISTINGS,
                    ESTIMATED_TOTAL_FUNDING: grant.ESTIMATED_TOTAL_FUNDING || existingGrant.ESTIMATED_TOTAL_FUNDING,
                    EXPECTED_NUMBER_OF_AWARDS: grant.EXPECTED_NUMBER_OF_AWARDS || existingGrant.EXPECTED_NUMBER_OF_AWARDS,
                    AWARD_CEILING: grant.AWARD_CEILING || existingGrant.AWARD_CEILING,
                    AWARD_FLOOR: grant.AWARD_FLOOR || existingGrant.AWARD_FLOOR,
                    COST_SHARING_MATCH_REQUIRMENT: grant.COST_SHARING_MATCH_REQUIRMENT || existingGrant.COST_SHARING_MATCH_REQUIRMENT,
                    LINK_TO_ADDITIONAL_INFORMATION: grant.LINK_TO_ADDITIONAL_INFORMATION || existingGrant.LINK_TO_ADDITIONAL_INFORMATION,
                    GRANTOR_CONTACT: grant.GRANTOR_CONTACT || existingGrant.GRANTOR_CONTACT,
                    GRANTOR_CONTACT_PHONE: grant.GRANTOR_CONTACT_PHONE || existingGrant.GRANTOR_CONTACT_PHONE,
                    GRANTOR_CONTACT_EMAIL: grant.GRANTOR_CONTACT_EMAIL || existingGrant.GRANTOR_CONTACT_EMAIL,
                    ESTIMATED_POST_DATE: grant.ESTIMATED_POST_DATE || existingGrant.ESTIMATED_POST_DATE,
                    ESTIMATED_APPLICATION_DUE_DATE: grant.ESTIMATED_APPLICATION_DUE_DATE || existingGrant.ESTIMATED_APPLICATION_DUE_DATE,
                    POSTED_DATE: grant.POSTED_DATE || existingGrant.POSTED_DATE,
                    CLOSE_DATE: grant.CLOSE_DATE || existingGrant.CLOSE_DATE,
                    OPPORTUNITY_STATUS: grant.OPPORTUNITY_STATUS || existingGrant.OPPORTUNITY_STATUS,
                    FUNDING_DESCRIPTION: grant.FUNDING_DESCRIPTION || existingGrant.FUNDING_DESCRIPTION,
                    ELIGIBLE_APPLICANTS: grant.ELIGIBLE_APPLICANTS || existingGrant.ELIGIBLE_APPLICANTS,
                });
            } else {
                await Grant.create({
                    OPPORTUNITY_NUMBER: grant.OPPORTUNITY_NUMBER,
                    OPPORTUNITY_ID: grant.OPPORTUNITY_ID,
                    OPPORTUNITY_NUMBER_LINK: grant.OPPORTUNITY_NUMBER_LINK,
                    OPPORTUNITY_TITLE: grant.OPPORTUNITY_TITLE,
                    AGENCY_CODE: grant.AGENCY_CODE,
                    AGENCY_NAME: grant.AGENCY_NAME,
                    CATEGORY_OF_FUNDING_ACTIVITY: grant.CATEGORY_OF_FUNDING_ACTIVITY,
                    FUNDING_CATEGORY_EXPLANATION: grant.FUNDING_CATEGORY_EXPLANATION,
                    FUNDING_INSTRUMENT_TYPE: grant.FUNDING_INSTRUMENT_TYPE,
                    ASSISTANCE_LISTINGS: grant.ASSISTANCE_LISTINGS,
                    ESTIMATED_TOTAL_FUNDING: grant.ESTIMATED_TOTAL_FUNDING,
                    EXPECTED_NUMBER_OF_AWARDS: grant.EXPECTED_NUMBER_OF_AWARDS,
                    AWARD_CEILING: grant.AWARD_CEILING,
                    AWARD_FLOOR: grant.AWARD_FLOOR,
                    COST_SHARING_MATCH_REQUIRMENT: grant.COST_SHARING_MATCH_REQUIRMENT,
                    LINK_TO_ADDITIONAL_INFORMATION: grant.LINK_TO_ADDITIONAL_INFORMATION,
                    GRANTOR_CONTACT: grant.GRANTOR_CONTACT,
                    GRANTOR_CONTACT_PHONE: grant.GRANTOR_CONTACT_PHONE,
                    GRANTOR_CONTACT_EMAIL: grant.GRANTOR_CONTACT_EMAIL,
                    ESTIMATED_POST_DATE: grant.ESTIMATED_POST_DATE,
                    ESTIMATED_APPLICATION_DUE_DATE: grant.ESTIMATED_APPLICATION_DUE_DATE,
                    POSTED_DATE: grant.POSTED_DATE,
                    CLOSE_DATE: grant.CLOSE_DATE,
                    OPPORTUNITY_STATUS: grant.OPPORTUNITY_STATUS || "Posted",
                    FUNDING_DESCRIPTION: grant.FUNDING_DESCRIPTION,
                    ELIGIBLE_APPLICANTS: grant.ELIGIBLE_APPLICANTS,
                });
            }
        }));
        return { message: "Grants fetched successfully" };
    } catch (err) {
        console.error('Error in /fetchGrants:', err);
        return { error: 'Failed to trigger grants', error: err.message };
    }
};

// Priority Cron Job to update the priority of the support tickets in the database
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

// Delete Expired Proposals and their associated files from GridFS Cron Job
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

// Delete Expired Grant Proposals and their associated files from GridFS Cron Job
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

// Fetch RFPs Cron Job to fetch the RFPs from the RFP API and save them to the database
exports.fetchRFPs = async () => {
    try {
        //Fetch RFPs from the RFP API and save them to the database
        const response = await axios.get(`${process.env.PIPELINE_URL}/rfp/getRFPs`);

        const rfp_data = response.data.rfp_data;

        //Check if the RFPs are already in the database and if not then save them else update them
        await Promise.all(rfp_data.map(async (rfp) => {
            const existingRFP = await RFP.findOne({ solicitationNumber: rfp.solicitation_number });
            if (existingRFP) {
                await RFP.findByIdAndUpdate(existingRFP._id, {
                    title: rfp.title,
                    description: rfp.description,
                    baseType: rfp.BaseType,
                    setAside: rfp.SetASide,
                    logo: rfp.logo,
                    budget: rfp.budget,
                    deadline: rfp.deadline,
                    organization: rfp.organization,
                    fundingType: rfp.fundingType,
                    organizationType: rfp.organizationType,
                    link: rfp.link,
                    contact: rfp.contact,
                    timeline: rfp.timeline,
                    solicitationNumber: rfp.solicitation_number,
                });
            } else {
                await RFP.create({
                    title: rfp.title,
                    description: rfp.description,
                    baseType: rfp.BaseType,
                    setAside: rfp.SetASide,
                    logo: rfp.logo,
                    budget: rfp.budget,
                    deadline: rfp.deadline,
                    organization: rfp.organization,
                    fundingType: rfp.fundingType,
                    organizationType: rfp.organizationType,
                    link: rfp.link,
                    contact: rfp.contact,
                    timeline: rfp.timeline,
                    solicitationNumber: rfp.solicitation_number,
                });
            }
        }));
        return { message: "RFPs fetched successfully" };
    } catch (err) {
        console.error('Error in fetchRFPs service:', err);
        return { message: "Error fetching RFPs", error: err.message };
    }
};
