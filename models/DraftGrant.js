const mongoose = require('mongoose');

const DraftGrantSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    grantId: { type: String, required: true },
    grant: {
        OPPORTUNITY_NUMBER: String,
        OPPORTUNITY_ID: String,
        OPPORTUNITY_NUMBER_LINK: String,
        OPPORTUNITY_TITLE: String,
        AGENCY_CODE: String,
        AGENCY_NAME: String,
        CATEGORY_OF_FUNDING_ACTIVITY: String,
        FUNDING_CATEGORY_EXPLANATION: String,
        FUNDING_INSTRUMENT_TYPE: String,
        ASSISTANCE_LISTINGS: String,
        ESTIMATED_TOTAL_FUNDING: String,
        EXPECTED_NUMBER_OF_AWARDS: String,
        AWARD_CEILING: String,
        AWARD_FLOOR: String,
        COST_SHARING_MATCH_REQUIRMENT: String,
        LINK_TO_ADDITIONAL_INFORMATION: String,
        GRANTOR_CONTACT: String,
        GRANTOR_CONTACT_PHONE: String,
        GRANTOR_CONTACT_EMAIL: String,
        ESTIMATED_POST_DATE: String,
        ESTIMATED_APPLICATION_DUE_DATE: String,
        POSTED_DATE: String,
        CLOSE_DATE: String,
        OPPORTUNITY_STATUS: String,
        FUNDING_DESCRIPTION: String,
        ELIGIBLE_APPLICANTS: String
    },
    generatedProposal: { type: Object, required: true },
    currentEditor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model("DraftGrant", DraftGrantSchema);