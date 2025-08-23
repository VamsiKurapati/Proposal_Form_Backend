const mongoose = require("mongoose");

const grantSchema = new mongoose.Schema({
    OPPORTUNITY_NUMBER: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    OPPORTUNITY_ID: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    OPPORTUNITY_NUMBER_LINK: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    OPPORTUNITY_TITLE: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    AGENCY_CODE: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    AGENCY_NAME: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    CATEGORY_OF_FUNDING_ACTIVITY: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    FUNDING_CATEGORY_EXPLANATION: {
        type: String,
        default: "Not Provided"
    },
    FUNDING_INSTRUMENT_TYPE: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    ASSISTANCE_LISTINGS: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    ESTIMATED_TOTAL_FUNDING: {
        type: String,
        default: "Not Provided"
    },
    EXPECTED_NUMBER_OF_AWARDS: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    AWARD_CEILING: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    AWARD_FLOOR: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    COST_SHARING_MATCH_REQUIRMENT: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    LINK_TO_ADDITIONAL_INFORMATION: {
        type: String,
        default: "Not Provided"
    },
    GRANTOR_CONTACT: {
        type: String,
        required: true
    },
    GRANTOR_CONTACT_PHONE: {
        type: String,
        default: "Not Provided"
    },
    GRANTOR_CONTACT_EMAIL: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    ESTIMATED_POST_DATE: {
        type: String,
        default: "Not Provided"
    },
    ESTIMATED_APPLICATION_DUE_DATE: {
        type: String,
        default: "Not Provided"
    },
    POSTED_DATE: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    CLOSE_DATE: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    OPPORTUNITY_STATUS: {
        type: String,
        required: true,
        enum: ["Posted", "Forecasted", "Closed", "Archived"]
    },
    FUNDING_DESCRIPTION: {
        type: String,
        required: true,
        default: "Not Provided"
    },
    ELIGIBLE_APPLICANTS: {
        type: String,
        required: true,
        default: "Not Provided"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Grant", grantSchema);
