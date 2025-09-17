const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const EmployeeProfile = require('../models/EmployeeProfile');
const axios = require('axios');
const MatchedRFP = require('../models/MatchedRFP');
const RFP = require('../models/RFP');
const DraftRFP = require('../models/DraftRFP');
const GrantProposal = require('../models/GrantProposal');
const DraftGrant = require('../models/DraftGrant');
const Subscription = require('../models/Subscription');
const CompanyProfile = require('../models/CompanyProfile');

const { getStructuredJson } = require('../utils/get_structured_json');
const { decompress } = require('../utils/decompress');
const { convertPdfToJsonFile } = require('../utils/pdfToJsonConverter');
const { GridFsStorage } = require("multer-gridfs-storage");
const multer = require("multer");

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => {
    return {
      bucketName: "uploads",
      filename: file.originalname,
    };
  },
});

const upload = multer({ storage });
const singleFileUpload = upload.single('file');

const errorData = {
  message: "Error in basicComplianceCheckPdf",
  data: null
};

require('dotenv').config();

//Helper function to get file buffer from GridFS
async function getFileBufferFromGridFS(fileId) {
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads"
  });
  const downloadStream = bucket.openDownloadStream(fileId);
  const chunks = [];
  return new Promise((resolve, reject) => {
    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    downloadStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    downloadStream.on('error', (error) => {
      reject(error);
    });
  });
}

exports.basicComplianceCheck = async (req, res) => {
  try {
    const { jsonData, proposalId, isCompressed } = req.body;

    const new_proposal = await Proposal.findById(proposalId);

    const decompressedProposal = isCompressed ? decompress(jsonData) : jsonData;

    const structuredJson = getStructuredJson(decompressedProposal, new_proposal.initialProposal);

    const resProposal = await axios.post(`${process.env.PIPELINE_URL}/basic-compliance`, structuredJson, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
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

exports.basicComplianceCheckPdf = [
  singleFileUpload,
  async (req, res) => {
    try {
      const { file } = req;

      let userEmail = req.user.email;
      let userId = req.user._id;
      if (req.user.role === "employee") {
        const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
        userEmail = employeeProfile.companyMail;
        const companyProfile = await CompanyProfile.findOne({ email: userEmail });
        if (!companyProfile) {
          return res.status(404).json({ message: "Company profile not found" });
        }
        userId = companyProfile.userId;
      }

      //check for active subscription
      const subscription = await Subscription.findOne({ user_id: userId });
      if (!subscription || subscription.end_date < new Date()) {
        return res.status(404).json({ message: "Subscription not found or expired" });
      }

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = await getFileBufferFromGridFS(file.id);

      const jsonString = await convertPdfToJsonFile(fileBuffer);

      // Parse the JSON string to an object
      let jsonData;
      try {
        jsonData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse JSON from PDF converter:', parseError);
        errorData.data = jsonString;
        return res.status(500).json({
          message: "Failed to parse extracted JSON data",
          error: parseError.message,
          data: errorData
        });
      }

      errorData.data = jsonData;

      const resProposal = await axios.post(`${process.env.PIPELINE_URL}/basic-compliance`, jsonData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = resProposal.data.report;

      const firstKey = Object.keys(data)[0];

      const firstValue = data[firstKey];

      const compliance_data = firstValue["compliance_flags"];

      res.status(200).json(compliance_data);
    } catch (error) {
      console.error('Error in basicComplianceCheckPdf:', error);
      res.status(500).json({ message: error.message, data: errorData });
    }
  }
];

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


    const resBasicCompliance = await axios.post(`${process.env.PIPELINE_URL}/basic-compliance`, structuredJson, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const dataBasicCompliance = resBasicCompliance.data.report;

    const firstKey = Object.keys(dataBasicCompliance)[0];
    const firstValue = dataBasicCompliance[firstKey];

    const compliance_dataBasicCompliance = firstValue["compliance_flags"];

    const resProposal = await axios.post(`${process.env.PIPELINE_URL}/advance-compliance`, initialProposal_1, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const dataAdvancedCompliance = resProposal.data.report;

    res.status(200).json({ compliance_dataBasicCompliance, dataAdvancedCompliance });

  } catch (error) {
    const statusCode = error.response && error.response.status ? error.response.status : 500;
    const responseData = error.response && error.response.data ? error.response.data : null;
    console.error('Error in advancedComplianceCheck:', responseData || error.message);
    res.status(statusCode).json({ message: 'Advanced compliance check failed', error: responseData || error.message });
  }
};

exports.advancedComplianceCheckPdf = [
  singleFileUpload,
  async (req, res) => {
    try {
      const { file } = req;
      const { rfpId } = req.body;

      let userEmail = req.user.email;
      let userId = req.user._id;

      if (req.user.role === "employee") {
        const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
        if (!employeeProfile) {
          return res.status(404).json({ message: "Employee profile not found" });
        }
        userEmail = employeeProfile.companyMail;
        const companyProfile = await CompanyProfile.findOne({ email: userEmail });
        if (!companyProfile) {
          return res.status(404).json({ message: "Company profile not found" });
        }
        userId = companyProfile.userId;
      }

      //check for active subscription
      const subscription = await Subscription.findOne({ user_id: userId });
      if (!subscription || subscription.end_date < new Date()) {
        return res.status(404).json({ message: "Subscription not found or expired" });
      }

      //check if subscription is pro or enterprise or custom
      if (subscription.plan_name !== "Pro" && subscription.plan_name !== "Enterprise" && subscription.plan_name !== "Custom Enterprise Plan") {
        return res.status(404).json({ message: "You are not authorized to use this feature" });
      }

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = await getFileBufferFromGridFS(file.id);

      const jsonString = await convertPdfToJsonFile(fileBuffer);

      //console.log("JSON extracted: ", jsonString);

      let jsonData;
      try {
        jsonData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse JSON from PDF converter:', parseError);
        errorData.data = jsonString;
        return res.status(500).json({
          message: "Failed to parse extracted JSON data",
          error: parseError.message,
          data: errorData
        });
      }

      errorData.data = jsonData;

      const resBasicCompliance = await axios.post(`${process.env.PIPELINE_URL}/basic-compliance`, jsonData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const dataBasicCompliance = resBasicCompliance.data.report;

      const firstKey = Object.keys(dataBasicCompliance)[0];
      const firstValue = dataBasicCompliance[firstKey];
      const compliance_dataBasicCompliance = firstValue["compliance_flags"];

      const rfp = await MatchedRFP.findOne({ _id: rfpId, email: userEmail }) || await RFP.findOne({ _id: rfpId, email: userEmail });

      const rfp_1 = {
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
      };

      const resProposal = await axios.post(`${process.env.PIPELINE_URL}/advance-compliance`, {
        "rfp": rfp_1,
        "proposal": jsonData,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const dataAdvancedCompliance = resProposal.data.report;

      res.status(200).json({ compliance_dataBasicCompliance, dataAdvancedCompliance });

    } catch (error) {
      console.error('Error in advancedComplianceCheckPdf:', error);
      res.status(500).json({ message: error.message, data: errorData });
    }
  }
];

exports.generatePDF = async (req, res) => {
  try {
    const { project, isCompressed } = req.body;

    const pdf = await axios.post(`${process.env.PIPELINE_URL}/download-pdf`, { "project": project, "isCompressed": isCompressed }, { responseType: "arraybuffer" });

    //console.log("PDF: ", pdf.data);

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
      // //console.log('No expired proposals found to delete.');
      return;
    }

    // //console.log(`Found ${expiredProposals.length} expired proposals to delete.`);

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
              // //console.log(`Deleted file: ${file.fileId}`);
            } catch (err) {
              console.error(`Failed to delete file ${file.fileId}:`, err.message);
            }
          }
        }

        // Delete the proposal from database
        await Proposal.findByIdAndDelete(proposal._id);
        // //console.log(`Deleted proposal: ${proposal._id} - ${proposal.title}`);

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

    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }

    const new_grant_proposal = await GrantProposal.findOne({ _id: proposalId, companyMail: userEmail });
    if (new_grant_proposal) {
      new_grant_proposal.generatedProposal = decompressedProject;
      await new_grant_proposal.save();

      const new_draft_grant = await DraftGrant.findOne({ proposalId: proposalId, userEmail: userEmail });
      if (new_draft_grant) {
        new_draft_grant.generatedProposal = decompressedProject;
        await new_draft_grant.save();
      }
      return res.status(200).json({ message: 'Grant proposal saved successfully' });
    }

    const new_proposal_1 = await Proposal.findOne({ _id: proposalId, companyMail: userEmail });
    if (new_proposal_1) {
      new_proposal_1.generatedProposal = decompressedProject;
      await new_proposal_1.save();

      const new_draft_proposal = await DraftRFP.findOne({ proposalId: proposalId, userEmail: userEmail });
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
