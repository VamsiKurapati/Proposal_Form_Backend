const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const axios = require('axios');
const MatchedRFP = require('../models/MatchedRFP');
const RFP = require('../models/RFP');
const DraftRFP = require('../models/DraftRFP');
const GrantProposal = require('../models/GrantProposal');
const Grant = require('../models/Grant');
const DraftGrant = require('../models/DraftGrant');
const fs = require('fs');
const path = require('path');
const { getStructuredJson } = require('../utils/get_structured_json');
const { decompress } = require('../utils/decompress');

require('dotenv').config();

exports.basicComplianceCheck = async (req, res) => {
  try {
    const { jsonData, proposalId, isCompressed } = req.body;

    const new_proposal = await Proposal.findById(proposalId);

    const decompressedProposal = isCompressed ? decompress(jsonData) : jsonData;

    const structuredJson = getStructuredJson(decompressedProposal, new_proposal.initialProposal);

    const resProposal = await axios.post('http://56.228.64.88:5000/basic-compliance', structuredJson, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = resProposal.data.report;

    const firstKey = Object.keys(data)[0];
    const firstValue = data[firstKey];

    const compliance_data = firstValue["compliance_flags"];

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

    const initialProposal_1 = {
      "rfp": {
        "RFP Title": rfp.title || "Not found",
        "RFP Description": rfp.description || "Not found",
        "Match Score": rfp.match || 0,
        "Budget": rfp.budget || "Not found",
        "Deadline": rfp.deadline || "Not found",
        "Issuing Organization": rfp.organization || "Not found",
        "Industry": rfp.organizationType || "Not found",
        "URL": rfp.link || "Not found",
        "Contact Information": rfp.contact || "Not found",
        "Timeline": rfp.timeline || "Not found",
      },
      "proposal": {
        ...structuredJson
      }
    };

    console.log("Sending structuredJson to basic compliance");

    const resBasicCompliance = await axios.post('http://56.228.64.88:5000/basic-compliance', structuredJson, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    console.log("Received response from basic compliance");

    const dataBasicCompliance = resBasicCompliance.data.report;

    const firstKey = Object.keys(dataBasicCompliance)[0];
    const firstValue = dataBasicCompliance[firstKey];

    const compliance_dataBasicCompliance = firstValue["compliance_flags"];

    console.log("Sending Data to advanced compliance");

    console.log("Data: ", initialProposal_1);

    fs.writeFileSync(path.join(__dirname, 'output.json'), initialProposal_1);

    const resProposal = await axios.post('http://56.228.64.88:5000/advance-compliance', initialProposal_1, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log("Received Data from advanced compliance");

    const dataAdvancedCompliance = resProposal.data.report;


    res.status(200).json({ compliance_dataBasicCompliance, dataAdvancedCompliance });
  } catch (error) {
    const statusCode = error.response && error.response.status ? error.response.status : 500;
    const responseData = error.response && error.response.data ? error.response.data : null;
    console.error('Error in advancedComplianceCheck:', responseData || error.message);
    res.status(statusCode).json({ message: 'Advanced compliance check failed', error: responseData || error.message });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const { project, isCompressed } = req.body;
    const decompressedProject = isCompressed ? decompress(project) : project;

    console.log("Sending Data to generatePDF");

    console.log("Data: ", decompressedProject);

    const structuredJson = getStructuredJson(decompressedProject, decompressedProject.initialProposal);

    console.log("Structured Json: ", structuredJson);

    const pdf = await axios.post('http://56.228.64.88:5000/download-pdf', decompressedProject, {
      headers: {
        'Content-Type': 'application/json',
      },
      responseType: "arraybuffer"
    });

    console.log("Received response from generatePDF");

    console.log("PDF: ", pdf.data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="proposal.pdf"');
    res.status(200).send(pdf.data);
  } catch (error) {
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


exports.autoSaveProposal = async (req, res) => {
  try {
    const { proposalId, jsonData, isCompressed } = req.body;
    const decompressedProject = isCompressed ? decompress(jsonData) : jsonData;

    const new_grant_proposal = await GrantProposal.findOne({ proposalId: proposalId });
    if (new_grant_proposal) {
      new_grant_proposal.generatedProposal = decompressedProject;
      await new_grant_proposal.save();

      const new_draft_grant = await DraftGrant.findOne({ proposalId: proposalId });
      if (new_draft_grant) {
        new_draft_grant.generatedProposal = decompressedProject;
        await new_draft_grant.save();
      }
      return res.status(200).json({ message: 'Grant proposal saved successfully' });
    }

    const new_proposal_1 = await Proposal.findById(proposalId);
    if (new_proposal_1) {
      new_proposal_1.generatedProposal = decompressedProject;
      await new_proposal_1.save();

      const new_draft_proposal = await DraftRFP.findOne({ proposalId: proposalId });
      if (new_draft_proposal) {
        new_draft_proposal.generatedProposal = decompressedProject;
        await new_draft_proposal.save();
      }
      return res.status(200).json({ message: 'RFP proposal saved successfully' });
    }

    res.status(404).json({ message: 'Proposal not found' });

  } catch (error) {
    console.error('Error in autoSaveProposal:', error);
    res.status(500).json({ message: error.message });
  }
};
