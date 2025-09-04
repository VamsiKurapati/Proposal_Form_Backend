const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const axios = require('axios');
const MatchedRFP = require('../models/MatchedRFP');
const RFP = require('../models/RFP');

const { getStructuredJson } = require('../utils/get_structured_json');
const { decompress } = require('../utils/decompress');

require('dotenv').config();

exports.basicComplianceCheck = async (req, res) => {
  try {
    const { jsonData, proposalId, isCompressed } = req.body;
    // console.log("Proposal: ", jsonData);
    // console.log("Proposal ID: ", proposalId);
    // console.log("Is compressed: ", isCompressed);

    const new_proposal = await Proposal.findById(proposalId);
    // console.log("New proposal: ", new_proposal);

    const decompressedProposal = isCompressed ? decompress(jsonData) : jsonData;
    const structuredJson = getStructuredJson(decompressedProposal, new_proposal.initialProposal);

    const resProposal = await axios.post('http://56.228.64.88:5000/basic-compliance', structuredJson, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // console.log("Response: ", resProposal);

    const data = resProposal.data.report;

    const firstKey = Object.keys(data)[0];
    const firstValue = data[firstKey];

    const compliance_data = firstValue["compliance_flags"];

    // console.log("Compliance data: ", compliance_data);

    res.status(200).json(compliance_data);
  } catch (error) {
    console.error('Error in basicComplianceCheck:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

exports.advancedComplianceCheck = async (req, res) => {
  try {
    const { jsonData, proposalId, isCompressed } = req.body;

    const decompressedProposal = isCompressed ? decompress(jsonData) : jsonData;

    const new_proposal = await Proposal.findById(proposalId);

    const structuredJson = getStructuredJson(decompressedProposal, new_proposal.initialProposal);

    const rfp = await MatchedRFP.findById(new_proposal.rfpId) || await RFP.findById(new_proposal.rfpId);

    const initialProposal_1 = [{
      "rfp": {
        "RFP Title": rfp.title,
        "RFP Description": rfp.description,
        "Issuing Organization": rfp.organization,
        "Industry": rfp.organizationType,
        "Proposal Submission Instructions": "Not found",
        "Submission Deadline": rfp.deadline,
        "Contact Information": rfp.contact,
        "Project Goals and Objectives": "Not found",
        "Scope of Work": "Not found",
        "Timeline / Project Schedule": rfp.timeline,
        "Budget or Funding Limit": rfp.budget,
        "Evaluation Criteria": "Not found",
        "Proposal Format/Structure": "Not found",
        "Eligibility Requirements": "Not found",
        "Appendices or Annexures": "Not found",
        "Requested Proposal Information": "Not found",
      },
      "proposal": {
        ...structuredJson,
        "email": new_proposal.companyMail,
        "rfpTitle": rfp.title
      }
    }];

    console.log("Initial proposal: ", initialProposal_1);

    const resProposal = await axios.post('http://56.228.64.88:5000/advance-compliance', initialProposal_1, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // console.log("Response: ", resProposal);

    const data = resProposal.data.report;

    const present_data = data.present_information;
    const missing_data = data.missing_information;
    const requested_data = data.requested_information;
    // console.log("Present data: ", present_data);
    // console.log("Missing data: ", missing_data);
    // console.log("Requested data: ", requested_data);

    res.status(200).json({ present_data, missing_data, requested_data });
  } catch (error) {
    console.error('Error in advancedComplianceCheck:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const { jsonData, isCompressed } = req.body;
    // console.log("Project: ", jsonData);
    const decompressedProject = isCompressed ? decompress(jsonData) : jsonData;
    const pdf = await axios.post('http://56.228.64.88:5000/download-pdf', decompressedProject, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      responseType: "arraybuffer"
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="proposal.pdf"');
    res.status(200).send(pdf.data);
  } catch (error) {
    console.error('Error in generatePDF:', error);
    res.status(500).json({ message: error.message });
  }
};


// Service to delete expired proposals and their associated files from GridFS

//CRON Service
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
      // console.log('No expired proposals found to delete.');
      return;
    }

    // console.log(`Found ${expiredProposals.length} expired proposals to delete.`);

    // Delete each expired proposal and its associated files
    for (const proposal of expiredProposals) {
      try {
        // Delete associated files from GridFS
        if (proposal.uploadedDocuments && proposal.uploadedDocuments.length > 0) {
          const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads',
          });

          for (const file of proposal.uploadedDocuments) {
            try {
              await bucket.delete(new mongoose.Types.ObjectId(file.fileId));
              // console.log(`Deleted file: ${file.fileId}`);
            } catch (err) {
              console.error(`Failed to delete file ${file.fileId}:`, err.message);
            }
          }
        }

        // Delete the proposal from database
        await Proposal.findByIdAndDelete(proposal._id);
        // console.log(`Deleted proposal: ${proposal._id} - ${proposal.title}`);

      } catch (err) {
        console.error(`Failed to delete proposal ${proposal._id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Error in deleteExpiredProposals service:', error);
  }
};

