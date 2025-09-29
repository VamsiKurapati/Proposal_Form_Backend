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

let errorData = {
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

    // Input validation
    if (!jsonData || !proposalId) {
      return res.status(400).json({ message: "jsonData and proposalId are required" });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      return res.status(400).json({ message: "Invalid proposal ID format" });
    }

    const new_proposal = await Proposal.findById(proposalId);
    if (!new_proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

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

      // Validate user exists
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

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

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type
      const allowedTypes = ['application/pdf'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only PDF files are allowed." });
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return res.status(400).json({ message: "File size exceeds 10MB limit" });
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

    // Input validation
    if (!jsonData || !proposalId) {
      return res.status(400).json({ message: "jsonData and proposalId are required" });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      return res.status(400).json({ message: "Invalid proposal ID format" });
    }

    const decompressedProposal = isCompressed ? decompress(jsonData) : jsonData;

    const new_proposal = await Proposal.findById(proposalId);
    if (!new_proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    const structuredJson = getStructuredJson(decompressedProposal, new_proposal.initialProposal);

    const rfp = await MatchedRFP.findById(new_proposal.rfpId) || await RFP.findById(new_proposal.rfpId);
    if (!rfp) {
      return res.status(404).json({ message: "RFP not found" });
    }

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
      console.log("Process Started at:", new Date().toISOString());
      const { file } = req;
      const { rfpId } = req.body;

      // Input validation
      if (!rfpId) {
        return res.status(400).json({ message: "rfpId is required" });
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(rfpId)) {
        return res.status(400).json({ message: "Invalid RFP ID format" });
      }

      // Validate user exists
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

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

      // Validate file type
      const allowedTypes = ['application/pdf'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only PDF files are allowed." });
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return res.status(400).json({ message: "File size exceeds 10MB limit" });
      }

      console.log("File Buffer Receiving Started at:", new Date().toISOString());

      const fileBuffer = await getFileBufferFromGridFS(file.id);

      console.log("File Buffer Receiving Completed at:", new Date().toISOString());

      console.log("File Buffer Conversion to JSON Started at:", new Date().toISOString());

      const jsonString = await convertPdfToJsonFile(fileBuffer);

      console.log("File Buffer Conversion to JSON Completed at:", new Date().toISOString());

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

      console.log("JSON Data Parsed at:", new Date().toISOString());

      errorData.data = jsonData;

      console.log("Basic Compliance Started at:", new Date().toISOString());

      const resBasicCompliance = await axios.post(`${process.env.PIPELINE_URL}/basic-compliance`, jsonData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log("Basic Compliance Completed at:", new Date().toISOString());

      const dataBasicCompliance = resBasicCompliance.data.report;

      const firstKey = Object.keys(dataBasicCompliance)[0];
      const firstValue = dataBasicCompliance[firstKey];
      const compliance_dataBasicCompliance = firstValue["compliance_flags"];

      let rfp = null;
      const new_rfp = await RFP.findOne({ _id: rfpId });
      if (new_rfp) {
        rfp = new_rfp;
      } else {
        rfp = await MatchedRFP.findOne({ _id: rfpId });
      }

      if (!rfp) {
        return res.status(404).json({ message: "RFP not found" });
      }

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

      console.log("Advanced Compliance Started at:", new Date().toISOString());

      const resProposal = await axios.post(`${process.env.PIPELINE_URL}/advance-compliance`, {
        "rfp": rfp_1,
        "proposal": jsonData,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log("Advanced Compliance Completed at:", new Date().toISOString());

      const dataAdvancedCompliance = resProposal.data.report;

      const rfpTitle = rfp.title;

      res.status(200).json({ compliance_dataBasicCompliance, dataAdvancedCompliance, rfpTitle });

    } catch (error) {
      console.error('Error in advancedComplianceCheckPdf:', error);
      res.status(500).json({ message: error.message, data: errorData });
    }
  }
];

exports.generatePDF = async (req, res) => {
  try {
    const { project, isCompressed } = req.body;

    // Input validation
    if (!project) {
      return res.status(400).json({ message: "project is required" });
    }

    const pdf = await axios.post(`${process.env.PIPELINE_URL}/download-pdf`, { "project": project, "isCompressed": isCompressed }, { responseType: "arraybuffer" });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="proposal.pdf"');
    res.status(200).send(pdf.data);
  } catch (error) {
    console.error('Error in generatePDF:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.autoSaveProposal = async (req, res) => {
  try {
    const { proposalId, jsonData, isCompressed } = req.body;

    // Input validation
    if (!proposalId || !jsonData) {
      return res.status(400).json({ message: "proposalId and jsonData are required" });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      return res.status(400).json({ message: "Invalid proposal ID format" });
    }

    // Validate user exists
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const decompressedProject = isCompressed ? decompress(jsonData) : jsonData;

    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      if (!employeeProfile) {
        return res.status(404).json({ message: "Employee profile not found" });
      }
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
