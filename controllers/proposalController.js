const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const axios = require('axios');
const MatchedRFP = require('../models/MatchedRFP');

require('dotenv').config();

exports.basicComplianceCheck = async (req, res) => {
  try {
    const proposal = req.body;
    console.log("Proposal: ", proposal);

    const resProposal = await axios.post('http://56.228.64.88:5000/basic-compliance', proposal);

    console.log("Response: ", resProposal);

    const data = resProposal.data.report;

    const firstKey = Object.keys(data)[0];
    const firstValue = data[firstKey];

    const compliance_data = firstValue["compliance_flags"];

    console.log("Compliance data: ", compliance_data);

    res.status(200).json(compliance_data);
  } catch (error) {
    console.error('Error in basicComplianceCheck:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

exports.advancedComplianceCheck = async (req, res) => {
  try {
    const proposal = req.body;
    console.log("Proposal: ", proposal);

    const rfp = await MatchedRFP.find({ title: proposal.rfpTitle });

    const initialProposal_1 = [{
      "rfp": rfp[0],
      "proposal": proposal
    }];

    console.log("Initial proposal: ", initialProposal_1);

    const resProposal = await axios.post('http://56.228.64.88:5000/advance-compliance', initialProposal_1);

    console.log("Response: ", resProposal);

    const data = resProposal.data.report;

    const present_data = data.present_information;
    const missing_data = data.missing_information;
    const requested_data = data.requested_information;
    console.log("Present data: ", present_data);
    console.log("Missing data: ", missing_data);
    console.log("Requested data: ", requested_data);

    res.status(200).json({ present_data, missing_data, requested_data });
  } catch (error) {
    console.error('Error in advancedComplianceCheck:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const proposal = req.body;
    // console.log("Proposal: ", proposal);

    const pdf = await axios.post('http://56.228.64.88:5000/download-pdf', proposal.pages);

    console.log("PDF: ", pdf.data);

    res.status(200).json(pdf.data);
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
      console.log('No expired proposals found to delete.');
      return;
    }

    console.log(`Found ${expiredProposals.length} expired proposals to delete.`);

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
              console.log(`Deleted file: ${file.fileId}`);
            } catch (err) {
              console.error(`Failed to delete file ${file.fileId}:`, err.message);
            }
          }
        }

        // Delete the proposal from database
        await Proposal.findByIdAndDelete(proposal._id);
        console.log(`Deleted proposal: ${proposal._id} - ${proposal.title}`);

      } catch (err) {
        console.error(`Failed to delete proposal ${proposal._id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Error in deleteExpiredProposals service:', error);
  }
};

