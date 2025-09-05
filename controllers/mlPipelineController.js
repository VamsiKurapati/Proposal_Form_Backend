require('dotenv').config();

const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const MatchedRFP = require('../models/MatchedRFP');
const RFP = require('../models/RFP');
const Grant = require('../models/Grant');
const SavedRFP = require('../models/SavedRFP');
const DraftRFP = require('../models/DraftRFP');
const EmployeeProfile = require('../models/EmployeeProfile');
const CompanyProfile = require('../models/CompanyProfile');
const CalendarEvent = require('../models/CalendarEvents');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const SavedGrant = require('../models/SavedGrant');
const DraftGrant = require('../models/DraftGrant');
const GrantProposal = require('../models/GrantProposal');
const ProposalTracker = require('../models/ProposalTracker');


const axios = require('axios');

const { replaceTextInJson } = require('../utils/json_replacer');
const { replaceTextInJson_Grant } = require('../utils/grant_json_replacer');
const path = require('path');
const template_json = path.join(__dirname, "template.json");
const grant_template_json = path.join(__dirname, "grant_template.json");

const { GridFsStorage } = require("multer-gridfs-storage");
const multer = require("multer");

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return {
      bucketName: "uploads",
      filename: file.originalname,
    };
  },
});

// Add error handling for GridFS storage
storage.on('error', (error) => {
  console.error('GridFS storage error:', error);
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF and TXT files
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain' ||
      file.originalname.endsWith('.pdf') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'), false);
    }
  }
});

const singleFileUpload = upload.single('file');

// File validation utilities
const validateFile = (file) => {
  const errors = [];

  // File size validation (10MB limit)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > MAX_FILE_SIZE) {
    errors.push({
      type: 'SIZE_LIMIT_EXCEEDED',
      message: 'File size too large. Maximum size is 10MB.',
      currentSize: file.size,
      maxSize: MAX_FILE_SIZE
    });
  }

  // File type validation
  const allowedMimeTypes = [
    'application/pdf',
    'text/plain',
  ];

  const allowedExtensions = ['.pdf', '.txt'];
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

  if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
    errors.push({
      type: 'INVALID_FILE_TYPE',
      message: 'Invalid file type. Only PDF and TXT files are allowed.',
      allowedTypes: ['PDF', 'TXT'],
      receivedType: file.mimetype,
      receivedExtension: fileExtension
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};



exports.postAllRFPs = async (req, res) => {
  try {
    const nestedRFPs = req.body;

    const transformedData = [];

    for (const rfp of nestedRFPs) {
      transformedData.push({
        title: rfp['RFP Title'] || "",
        description: rfp['RFP Description'] || "",
        logo: 'None',
        budget: rfp['Budget'] || 'Not found',
        deadline: rfp['Deadline'] || "",
        organization: rfp['Organization'] || rfp['Issuing Organization'] || "",
        fundingType: 'Government',
        organizationType: rfp['Industry'] || "",
        link: rfp['URL'] || "",
        contact: rfp['Contact Information'] || "",
        timeline: rfp['Timeline'] || "",
      });
    }

    const result = await RFP.insertMany(transformedData);

    res.status(200).json({ "message": "RFPs saved successfully", "data": result });
  } catch (err) {
    console.error('Error in /postAllRFPs:', err);
    res.status(500).json({ error: 'Failed to load RFPs' });
  }
};

exports.getRecommendedAndSavedRFPs = async (req, res) => {
  try {
    let userEmail = req.user.email;

    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }

    // Recommended: from matched RFPs with match >= 60, sorted by latest
    const recommendedRFPs = await MatchedRFP.find({ email: userEmail, match: { $gte: 60 } })
      .sort({ createdAt: -1 })
      .lean();

    // Saved: from SavedRFPs
    const savedRFPs_1 = await SavedRFP.find({ userEmail }).lean();
    const savedRFPs = savedRFPs_1.map((item) => {
      return {
        ...item.rfp,
        _id: item.rfpId,
      }
    });

    res.status(200).json({
      recommendedRFPs,
      savedRFPs,
    });
  } catch (err) {
    console.error('Error in /getRecommendedAndSavedRFPs:', err);
    res.status(500).json({ error: 'Failed to load RFPs' });
  }
};

exports.getOtherRFPs = async (req, res) => {
  try {
    const industries = req.body.industries;
    const otherRFPs = await RFP.find({ organizationType: { $in: industries } }).lean();

    res.status(200).json({ otherRFPs });
  } catch (err) {
    console.error('Error in /getOtherRFPs:', err);
    res.status(500).json({ error: 'Failed to load RFPs' });
  }
};

exports.getSavedAndDraftRFPs = async (req, res) => {
  try {
    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }

    const savedRFPs_1 = await SavedRFP.find({ userEmail }).lean();
    const savedRFPs = savedRFPs_1.map((item) => {
      return {
        ...item.rfp,
        _id: item.rfpId,
      }
    });

    const draftRFPs = await DraftRFP.find({ userEmail }).populate('currentEditor', '_id fullName email').lean();
    const draftRFPs_1 = draftRFPs.map((item) => {
      return {
        generatedProposal: item.generatedProposal,
        currentEditor: item.currentEditor,
        proposalId: item.proposalId,
        rfpId: item.rfpId,
        ...item.rfp,
        _id: item.rfpId,
      }
    });

    res.status(200).json({ savedRFPs, draftRFPs: draftRFPs_1 });
  } catch (err) {
    console.error('Error in /getSavedAndDraftRFPs:', err);
    res.status(500).json({ error: 'Failed to get saved and draft RFPs' });
  }
};

exports.saveRFP = async (req, res) => {
  try {
    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }
    const { rfpId, rfp } = req.body;

    if (!rfpId || !rfp) {
      return res.status(400).json({ error: 'rfpId and rfp are required' });
    }

    const existing = await SavedRFP.findOne({ userEmail, rfpId });
    if (existing) {
      return res.status(200).json({ message: 'Already saved' });
    }

    const cleanRFP = {
      title: rfp.title,
      description: rfp.description,
      logo: rfp.logo,
      match: rfp.match || 0,
      budget: rfp.budget,
      deadline: rfp.deadline,
      organization: rfp.organization,
      fundingType: rfp.fundingType,
      organizationType: rfp.organizationType,
      link: rfp.link,
      contact: rfp.contact,
      timeline: rfp.timeline,
    };

    const newSave = await SavedRFP.create({ userEmail, rfpId, rfp: cleanRFP });
    res.status(201).json({ message: 'RFP saved successfully', saved: newSave });
  } catch (err) {
    console.error('Error in /saveRFP:', err);
    res.status(500).json({ error: 'Failed to save RFP' });
  }
};

exports.unsaveRFP = async (req, res) => {
  try {
    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }
    const { rfpId } = req.body;

    if (!rfpId) {
      return res.status(400).json({ error: 'rfpId is required' });
    }

    await SavedRFP.deleteOne({ userEmail, rfpId });

    res.status(200).json({ message: 'RFP unsaved successfully' });
  } catch (err) {
    console.error('Error in /unsaveRFP:', err);
    res.status(500).json({ error: 'Failed to unsave RFP' });
  }
};

exports.saveDraftRFP = async (req, res) => {
  try {
    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }

    const { rfpId, rfp } = req.body;

    const existing = await DraftRFP.findOne({ userEmail, rfpId });
    if (existing) {
      return res.status(200).json({ message: 'Already saved' });
    }

    const cleanRFP = {
      title: rfp.title,
      description: rfp.description,
      logo: rfp.logo,
      match: rfp.match || 0,
      budget: rfp.budget,
      deadline: rfp.deadline,
      organization: rfp.organization,
      fundingType: rfp.fundingType,
      organizationType: rfp.organizationType,
      link: rfp.link,
      contact: rfp.contact,
      timeline: rfp.timeline,
    };

    const newDraft = await DraftRFP.create({ userEmail, rfpId, rfp: cleanRFP });
    res.status(201).json({ message: 'RFP saved successfully', saved: newDraft });
  } catch (err) {
    console.error('Error in /saveDraftRFP:', err);
    res.status(500).json({ error: 'Failed to save draft RFP' });
  }
};

exports.sendDataForProposalGeneration = async (req, res) => {
  try {
    const { proposal } = req.body;

    // Validate proposal object
    if (!proposal) {
      return res.status(400).json({ error: 'Proposal data is required' });
    }

    let userEmail = req.user.email;

    let companyProfile_1 = "";

    let userId = "";

    if (req.user.role === "employee") {

      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });

      if (!employeeProfile) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }

      userEmail = employeeProfile.companyMail;

      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });

      let user = await User.findOne({ email: userEmail });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      userId = user._id;

    } else {
      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });

      userId = req.user._id;

    }

    // Check if company profile exists
    if (!companyProfile_1) {
      return res.status(404).json({ error: 'Company profile not found. Please complete your company profile first.' });
    }

    const db = mongoose.connection.db;

    //Extract the company Documents from upload.chunks and save them in the companyProfile_1.companyDocuments
    const files = await db.collection('uploads.files')
      .find({ _id: { $in: companyProfile_1.documents.map(doc => doc.fileId) } })
      .toArray();

    // Check if files were found
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No uploaded files found. Please ensure all company documents are properly uploaded.' });
    }

    const filesWithBase64 = await Promise.all(
      files.map(async (file) => {
        const chunks = await db.collection('uploads.chunks')
          .find({ files_id: file._id })
          .sort({ n: 1 })
          .toArray();
        const fileBuffer = Buffer.concat(chunks.map(chunk => chunk.data.buffer));
        return {
          ...file,
          base64: fileBuffer.toString('base64'),
        };
      })
    );

    const filesMap = filesWithBase64.reduce((acc, file) => {
      acc[file._id.toString()] = file;
      return acc;
    }, {});

    // Check if all required files are available
    const missingFiles = companyProfile_1.documents.filter(doc => !filesMap[doc.fileId.toString()]);
    if (missingFiles.length > 0) {
      return res.status(400).json({
        error: 'Some company documents are missing or corrupted. Please re-upload the following documents: ' +
          missingFiles.map(doc => doc.name).join(', ')
      });
    }

    const companyDocuments_1 = companyProfile_1.documents.map((doc) => {
      return {
        [`${doc.name}.${doc.type}`]: `${filesMap[doc.fileId.toString()].base64}`,
      };
    });


    const caseStudies_1 = (companyProfile_1.caseStudies || []).map((study) => {
      return {
        [`${study.title}`]: `${study.about}`,
      };
    });


    const pastProjects_1 = (companyProfile_1.proposals || []).map((project) => {
      return {
        "name": `${project.title}`,
      };
    });


    const certifications_1 = (companyProfile_1.licensesAndCertifications || []).map((certification) => {
      return {
        "name": `${certification.name}`,
        "issuer": `${certification.issuer}`,
        "validTill": `${certification.validTill}`,
      };
    });

    const employeeData_1 = (companyProfile_1.employees || []).map((employee) => {
      return {
        "name": `${employee.name}`,
        "jobTitle": `${employee.jobTitle}`,
        "highestQualification": `${employee.highestQualification}`,
        "skills": (employee.skills || []).map(skill => `${skill}`),
        "email": `${employee.email}`,
      };
    });

    const rfp = {
      "RFP Title": `${proposal.title || ""}`,
      "RFP Description": `${proposal.description || ""}`,
      "Match Score": `${proposal.match || 0}`,
      "Budget": `${proposal.budget || ""}`,
      "Deadline": `${proposal.deadline || ""}`,
      "Issuing Organization": `${proposal.organization || "Not found"}`,
      "Industry": `${proposal.organizationType || ""}`,
      "URL": `${proposal.link || ""}`,
      "Contact Information": `${proposal.contact || ""}`,
      "Timeline": `${proposal.timeline || ""}`,
    };

    const userData = {
      "_id": `${companyProfile_1._id}`,
      "email": `${companyProfile_1.email || ""}`,
      "companyName": `${companyProfile_1.companyName || ""}`,
      "companyOverview": `${companyProfile_1.bio || ""}`,
      "yearOfEstablishment": `${companyProfile_1.establishedYear || ""}`,
      "employeeCount": `${companyProfile_1.numberOfEmployees || 0}`,
      "services": (companyProfile_1.services || []).map(service => `${service}`),
      "industry": `${companyProfile_1.industry || ""}`,
      "location": `${companyProfile_1.location || ""}`,
      "website": `${companyProfile_1.website || ""}`,
      "linkedIn": `${companyProfile_1.linkedIn || ""}`,
      "certifications": certifications_1,
      "documents": companyDocuments_1,
      "caseStudies": caseStudies_1,
      "pastProjects": pastProjects_1,
      "employees_information": employeeData_1,
      "awards": (companyProfile_1.awards || []).map(award => `${award}`),
      "clientPortfolio": (companyProfile_1.clients || []).map(client => `${client}`),
      "preferredIndustries": (companyProfile_1.preferredIndustries || []).map(industry => `${industry}`),
      "pointOfContact": {
        "name": `${companyProfile_1.adminName || ""}`,
        "email": `${companyProfile_1.email || ""}`,
      },
    };

    //Check if there is any proposal in draft with the same rfpId
    const draftProposal = await DraftRFP.findOne({ rfpId: proposal._id });
    if (draftProposal) {
      return res.status(200).json({ message: 'A proposal with the same RFP ID already exists in draft. Please edit the draft proposal instead of generating a new one.' });
    }

    //Check if there is any proposal in proposal tracker with the same rfpId
    const proposalTracker = await ProposalTracker.findOne({ rfpId: proposal._id });
    if (proposalTracker) {
      //Initilize the api call to mlPipeline to know the status of the proposal generation
      const res_1 = await axios.post(`http://56.228.64.88:5000/get_proposal_from_tracking_id/${proposalTracker.trackingId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      const res_data = res_1.data;

      if (res_data.status === "success") {
        // Check if ML service returned valid data
        if (!res_1.data.proposal) {
          console.error("ML service returned invalid response:", res_1.data);
          //Delete the proposal tracker
          await ProposalTracker.deleteOne({ rfpId: proposal._id });
          return res.status(500).json({
            error: 'ML service returned invalid response. Please try again later.',
            details: 'The proposal generation service is currently unavailable or returned an empty response.'
          });
        }

        const proposalData = res_1.data.proposal;

        const processedProposal = replaceTextInJson(template_json, proposalData, userData, rfp);

        const new_Proposal = new Proposal({
          rfpId: proposal._id || "",
          title: proposal.title || "",
          client: proposal.organization || "Not found",
          initialProposal: processedProposal,
          generatedProposal: processedProposal,
          companyMail: userEmail,
          deadline: proposal.deadline || new Date(),
          status: "In Progress",
          submittedAt: new Date(),
          currentEditor: req.user._id,
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          isSaved: false,
          savedAt: null,
          savedBy: null,
          restoreBy: null,
          restoredBy: null,
          restoredAt: null,
        });

        await new_Proposal.save();

        const new_Draft = new DraftRFP({
          userEmail: userEmail,
          rfpId: proposal._id || "",
          proposalId: new_Proposal._id || "",
          rfp: { ...proposal },
          generatedProposal: processedProposal,
          currentEditor: req.user._id,
        });
        await new_Draft.save();

        const new_CalendarEvent = new CalendarEvent({
          companyId: companyProfile_1._id,
          employeeId: req.user._id,
          proposalId: new_Proposal._id,
          grantId: null,
          title: proposal.title || "",
          startDate: new Date(),
          endDate: new Date(),
          status: "In Progress",
        });
        await new_CalendarEvent.save();

        res.status(200).json({ processedProposal, proposalId: new_Proposal._id });

        const new_ProposalTracker = new ProposalTracker({
          rfpId: proposal._id,
          proposalId: new_Proposal._id,
          trackingId: res_data.trackingId,
          companyMail: userEmail,
          status: "success",
        });
        await new_ProposalTracker.save();

        return res.status(200).json({ message: 'Proposal Generation completed successfully.', proposal: processedProposal, proposalId: new_Proposal._id });
      } else if (res_data.status === "progress") {
        return res.status(200).json({ message: 'Proposal Generation is already in progress. Please wait for it to complete.' });
      } else if (res_data.status === "error") {
        //Delete the proposal tracker
        await ProposalTracker.deleteOne({ rfpId: proposal._id });
        return res.status(400).json({ error: 'Failed to generate proposal. Please try again later.' });
      }
    }

    const subscription = await Subscription.findOne({ userId: userId });
    if (!subscription || subscription.end_date < new Date()) {
      return res.status(400).json({ error: 'Subscription not found or expired' });
    }

    //Get no.of RFP proposals generated between subscription start date and end date
    const currentRFPs = await Proposal.find({ companyMail: userEmail, createdAt: { $gte: subscription.start_date, $lte: subscription.end_date } }).countDocuments();
    if (subscription.max_rfp_proposal_generations <= currentRFPs) {
      return res.status(400).json({ error: 'You have reached the maximum number of RFP proposals' });
    }

    const data = {
      "user": userData,
      "rfp": rfp,
    };

    // Calculate and log payload size
    const payloadSize = JSON.stringify(data).length;

    // Check if payload is too large (e.g., > 1MB)
    const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      console.warn(`Payload size (${payloadSize} bytes) exceeds recommended limit (${MAX_PAYLOAD_SIZE} bytes)`);

      // Optimize payload by reducing data size
      const optimizedData = {
        user: {
          ...data.user,
          // Truncate long text fields if needed
          companyOverview: data.user.companyOverview?.substring(0, 2000) || "",
          // Limit case studies to first 3
          caseStudies: data.user.caseStudies?.slice(0, 3) || [],
          // Limit past projects to first 5
          pastProjects: data.user.pastProjects?.slice(0, 5) || [],
          // Limit employees to first 10
          employees_information: data.user.employees_information?.slice(0, 10) || []
        },
        rfp: data.rfp
      };

      const optimizedPayloadSize = JSON.stringify(optimizedData).length;
      //console.log("Optimized payload size:", optimizedPayloadSize, "bytes");

      if (optimizedPayloadSize < payloadSize) {
        //console.log("Using optimized payload");
        data = optimizedData;
      }
    }

    // Call ML service with timeout and better error handling
    const res_1 = await axios.post(`http://56.228.64.88:5000/new_rfp_proposal_generation`, data, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const res_data = res_1.data;

    const new_ProposalTracker = new ProposalTracker({
      rfpId: proposal._id,
      proposalId: null,
      grantId: null,
      companyMail: userEmail,
      status: "progress",
      trackingId: res_data.trackingId,
    });
    await new_ProposalTracker.save();
    return res.status(200).json({ message: 'Proposal Generation is already in progress. Please wait for it to complete.' });
  } catch (err) {
    console.error('Error in /sendDataForProposalGeneration:', err);

    // Provide more specific error messages based on error type
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'Proposal generation service is unavailable',
        details: 'Unable to connect to the proposal generation service. Please try again later.'
      });
    }

    if (err.response?.status === 500) {
      return res.status(502).json({
        error: 'Proposal generation service error',
        details: 'The proposal generation service encountered an internal error. Please try again later.'
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Failed to send data for proposal generation',
      details: err.message || 'An unexpected error occurred'
    });
  }
};

exports.sendDataForRFPDiscovery = async (req, res) => {
  try {
    let userEmail = req.user.email;
    let companyProfile_1 = "";
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      if (!employeeProfile) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }
      userEmail = employeeProfile.companyMail;
      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });
    } else {
      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });
    }

    // Check if company profile exists
    if (!companyProfile_1) {
      return res.status(404).json({ error: 'Company profile not found. Please complete your company profile first.' });
    }

    // Check if company has documents before processing
    if (!companyProfile_1.documents || companyProfile_1.documents.length === 0) {
      return res.status(400).json({ error: 'No company documents found. Please upload company documents first.' });
    }

    const db = mongoose.connection.db;

    //Extract the company Documents from upload.chunks and save them in the companyProfile_1.companyDocuments
    const files = await db.collection('uploads.files')
      .find({ _id: { $in: companyProfile_1.documents.map(doc => doc.fileId) } })
      .toArray();

    // Check if files were found
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No uploaded files found. Please ensure all company documents are properly uploaded.' });
    }

    const filesWithBase64 = await Promise.all(
      files.map(async (file) => {
        const chunks = await db.collection('uploads.chunks')
          .find({ files_id: file._id })
          .sort({ n: 1 })
          .toArray();
        const fileBuffer = Buffer.concat(chunks.map(chunk => chunk.data.buffer));
        return {
          ...file,
          base64: fileBuffer.toString('base64'),
        };
      })
    );

    const filesMap = filesWithBase64.reduce((acc, file) => {
      acc[file._id.toString()] = file;
      return acc;
    }, {});

    // Check if all required files are available
    const missingFiles = companyProfile_1.documents.filter(doc => !filesMap[doc.fileId.toString()]);
    if (missingFiles.length > 0) {
      return res.status(400).json({
        error: 'Some company documents are missing or corrupted. Please re-upload the following documents: ' +
          missingFiles.map(doc => doc.name).join(', ')
      });
    }

    const companyDocuments_1 = companyProfile_1.documents.map((doc) => {
      return {
        [`${doc.name}.${doc.type}`]: `${filesMap[doc.fileId.toString()].base64}`,
      };
    });

    const caseStudies_1 = (companyProfile_1.caseStudies || []).map((study) => {
      return {
        [`${study.title}`]: `${study.about}`,
      };
    });

    const pastProjects_1 = (companyProfile_1.proposals || []).map((project) => {
      return {
        "name": `${project.title}`,
      };
    });

    const certifications_1 = (companyProfile_1.licensesAndCertifications || []).map((certification) => {
      return {
        "name": `${certification.name}`,
        "issuer": `${certification.issuer}`,
        "validTill": `${certification.validTill}`,
      };
    });

    const employeeData_1 = (companyProfile_1.employees || []).map((employee) => {
      return {
        "name": `${employee.name}`,
        "jobTitle": `${employee.jobTitle}`,
        "highestQualification": `${employee.highestQualification}`,
        "skills": (employee.skills || []).map(skill => `${skill}`),
        "email": `${employee.email}`,
      };
    });

    const userData = {
      "_id": `${companyProfile_1._id}`,
      "email": `${companyProfile_1.email || ""}`,
      "companyName": `${companyProfile_1.companyName || ""}`,
      "companyOverview": `${companyProfile_1.bio || ""}`,
      "yearOfEstablishment": companyProfile_1.establishedYear || "",
      "employeeCount": `${companyProfile_1.numberOfEmployees || 0}`,
      "services": (companyProfile_1.services || []).map(service => `${service}`),
      "industry": `${companyProfile_1.industry || ""}`,
      "location": `${companyProfile_1.location || ""}`,
      "website": `${companyProfile_1.website || ""}`,
      "linkedIn": `${companyProfile_1.linkedIn || ""}`,
      "certifications": certifications_1,
      "documents": companyDocuments_1,
      "caseStudies": caseStudies_1,
      "pastProjects": pastProjects_1,
      "employees_information": employeeData_1,
      "awards": (companyProfile_1.awards || []).map(award => `${award}`),
      "clientPortfolio": (companyProfile_1.clients || []).map(client => `${client}`),
      "preferredIndustries": (companyProfile_1.preferredIndustries || []).map(industry => `${industry}`),
      "pointOfContact": {
        "name": `${companyProfile_1.adminName || ""}`,
        "email": `${companyProfile_1.email || ""}`,
      }
    };

    const data = {
      user: userData,
    };

    const dataInArray = [data];

    const res_1 = await axios.post(`http://56.228.64.88:5000/run-rfp-discovery`, dataInArray);

    const nestedRFPs = res_1.data.matches;

    const transformedData = [];

    for (const [userId, rfpArray] of Object.entries(nestedRFPs)) {
      if (!Array.isArray(rfpArray)) continue;

      for (const rfp of rfpArray) {
        transformedData.push({
          title: rfp['RFP Title'] || "",
          description: rfp['RFP Description'] || "",
          logo: 'None',
          match: rfp['Match Score'] || 0,
          budget: rfp['Budget'] || 'Not found',
          deadline: rfp['Deadline'] || "",
          organization: rfp['Organization'] || rfp['Issuing Organization'] || "",
          fundingType: 'Government',
          organizationType: rfp['Industry'] || "",
          link: rfp['URL'] || "",
          type: 'Matched',
          contact: rfp['Contact Information'] || "",
          timeline: rfp['Timeline'] || "",
          email: companyProfile_1.email || ""
        });
      }
    }

    // Validate all required fields
    const requiredFields = [
      'title', 'description', 'logo', 'match', 'budget', 'deadline',
      'organization', 'fundingType', 'organizationType', 'link', 'type', 'contact', 'timeline', 'email'
    ];

    const invalidEntry = transformedData.find(rfp =>
      requiredFields.some(field => rfp[field] === undefined || rfp[field] === null)
    );

    if (invalidEntry) {
      // Log invalid entry for debugging but continue processing
    }

    const result = await MatchedRFP.insertMany(transformedData);

    res.status(200).json(result);
  } catch (err) {
    console.error('Error in /sendDataForRFPDiscovery:', err);
    res.status(500).json({ error: 'Failed to send data for RFP discovery' });
  }
};

exports.handleFileUploadAndSendForRFPExtraction = [
  (req, res, next) => {
    singleFileUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File too large. Maximum size is 10MB.',
            details: { code: err.code, field: err.field }
          });
        }
        return res.status(400).json({
          error: 'File upload error',
          details: err.message
        });
      } else if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          error: err.message || 'File upload failed'
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded'
        });
      }

      // File validation using utility function
      const validation = validateFile(req.file);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'File validation failed',
          details: validation.errors
        });
      }

      // Get user email
      let userEmail = req.user.email;
      if (req.user.role === "employee") {
        const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
        if (!employeeProfile) {
          return res.status(404).json({ error: 'Employee profile not found' });
        }
        userEmail = employeeProfile.companyMail;
      }

      // Retrieve file from GridFS since req.file.buffer is undefined with GridFS storage
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads'
      });

      // Get the file stream from GridFS
      const downloadStream = bucket.openDownloadStream(req.file.id);

      // Convert stream to buffer
      const chunks = [];
      const fileBuffer = await new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });
        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        downloadStream.on('error', (error) => {
          reject(error);
        });
      });

      // Create FormData for the external API
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      // Send file to external API with retry mechanism
      let apiResponse;
      let retryCount = 1;
      const maxRetries = 1;

      while (retryCount <= maxRetries) {
        try {
          apiResponse = await axios.post(`http://56.228.64.88:5000/extract-structured-rfp`, formData, {
            headers: {
              ...formData.getHeaders(),
            },
            timeout: 60000, // 60 second timeout for large files
          });
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw error; // Re-throw the error if all retries failed
          }
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      ////console.log("API Response: ", apiResponse);

      ////console.log("API Response Data: ", apiResponse.data);

      // Extract RFP data from API response
      let rfp = null;
      if (apiResponse.data && apiResponse.data.result && typeof apiResponse.data.result === 'object') {
        const resultKeys = Object.keys(apiResponse.data.result);
        if (resultKeys.length > 0) {
          const firstKey = resultKeys[0];
          const structuredData = apiResponse.data.result[firstKey];

          if (structuredData && structuredData.structured_fields) {
            const fields = structuredData.structured_fields;
            ////console.log("Fields: ", fields);

            rfp = {
              title: fields['RFP Title'] || req.file.originalname.replace('.pdf', "").replace('.txt', ""),
              description: fields['RFP Description'] || `RFP extracted from uploaded file: ${req.file.originalname}`,
              organization: fields['Issuing Organization'] || 'Unknown',
              organizationType: fields['Industry'] || 'Unknown',
              link: fields['url'] || "",
              budget: fields['Budget or Funding Limit'] || 'Not specified',
              deadline: fields['Submission Deadline'] || 'Not specified',
              contact: fields['Contact Information'] || "",
              timeline: fields['Timeline / Project Schedule'] || "",
              proposalInstructions: fields['Proposal Submission Instructions'] || "",
              projectGoals: fields['Project Goals and Objectives'] || "",
              scopeOfWork: fields['Scope of Work'] || "",
              logo: "None"
            };
          }
        }
      }

      // Create fallback RFP if API data extraction failed
      if (!rfp) {
        rfp = {
          title: "No RFP Title found in the uploaded file",
          description: "No RFP Description found in the uploaded file",
          organization: 'Unknown',
          organizationType: 'Unknown',
          link: "",
          budget: 'Not specified',
          deadline: 'Not specified',
          contact: "",
          timeline: "",
          logo: "None"
        };
      }

      // Enhance description with additional extracted information
      let enhancedDescription = rfp.description;
      if (rfp.projectGoals) {
        enhancedDescription += `\n\nProject Goals: ${rfp.projectGoals}`;
      }
      if (rfp.scopeOfWork) {
        enhancedDescription += `\n\nScope of Work: ${rfp.scopeOfWork}`;
      }
      if (rfp.proposalInstructions) {
        enhancedDescription += `\n\nSubmission Instructions: ${rfp.proposalInstructions}`;
      }

      const newRFP = await MatchedRFP.create({
        title: rfp.title,
        description: enhancedDescription,
        organization: rfp.organization || "",
        organizationType: rfp.organizationType || "",
        link: rfp.link || "",
        email: userEmail,
        budget: rfp.budget || 'Not found',
        deadline: rfp.deadline || "",
        contact: rfp.contact || "",
        timeline: rfp.timeline || "",
        match: 100.00,
        logo: 'None',
        type: 'Uploaded',
      });

      // Clean up: Delete the uploaded file from GridFS after processing
      try {
        await bucket.delete(req.file.id);
      } catch (deleteError) {
        // Log error but don't fail the request since RFP was already saved
        console.error('Failed to delete uploaded file from GridFS:', deleteError);
      }

      res.status(200).json({
        message: 'RFP extracted and saved successfully',
        rfp: newRFP,
        fileInfo: {
          originalName: req.file.originalname,
          size: formatFileSize(req.file.size),
          type: req.file.mimetype
        }
      });

    } catch (err) {
      // Clean up: Delete the uploaded file from GridFS even if there's an error
      if (req.file) {
        try {
          const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
          });
          await bucket.delete(req.file.id);
        } catch (deleteError) {
          console.error('Failed to delete uploaded file from GridFS after error:', deleteError);
        }
      }

      // Handle specific error types
      if (err.response?.status === 422) {
        return res.status(422).json({
          error: 'File format not supported or invalid content',
          details: err.response.data
        });
      }

      if (err.response?.status === 400) {
        return res.status(400).json({
          error: 'Invalid request to RFP extraction service',
          details: err.response.data
        });
      }

      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        return res.status(503).json({ error: 'RFP extraction service is unavailable' });
      }

      // Generic error response
      res.status(500).json({
        error: 'Failed to handle file upload and send for RFP extraction'
      });
    }
  }
];

exports.handleFileUploadAndSendForGrantExtraction = [
  (req, res, next) => {
    singleFileUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File too large. Maximum size is 10MB.',
            details: { code: err.code, field: err.field }
          });
        }
        return res.status(400).json({
          error: 'File upload error',
          details: err.message
        });
      } else if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          error: err.message || 'File upload failed'
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded'
        });
      }

      // File validation using utility function
      const validation = validateFile(req.file);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'File validation failed',
          details: validation.errors
        });
      }

      // Get user email
      let userEmail = req.user.email;
      if (req.user.role === "employee") {
        const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
        if (!employeeProfile) {
          return res.status(404).json({ error: 'Employee profile not found' });
        }
        userEmail = employeeProfile.companyMail;
      }

      // Retrieve file from GridFS since req.file.buffer is undefined with GridFS storage
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads'
      });

      // Get the file stream from GridFS
      const downloadStream = bucket.openDownloadStream(req.file.id);

      // Convert stream to buffer
      const chunks = [];
      const fileBuffer = await new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });
        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        downloadStream.on('error', (error) => {
          reject(error);
        });
      });

      // Create FormData for the external API
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      // Send file to external API with retry mechanism
      let apiResponse;
      let retryCount = 1;
      const maxRetries = 1;

      while (retryCount <= maxRetries) {
        try {
          apiResponse = await axios.post(`http://56.228.64.88:5000/extract-structured-grant`, formData, {
            headers: {
              ...formData.getHeaders(),
            },
            timeout: 60000, // 60 second timeout for large files
          });
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw error; // Re-throw the error if all retries failed
          }
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      ////console.log("API Response: ", apiResponse);

      ////console.log("API Response Data: ", apiResponse.data);

      // Extract Grant data from API response
      let grant = null;
      if (apiResponse.data && apiResponse.data.result && typeof apiResponse.data.result === 'object') {
        const resultKeys = Object.keys(apiResponse.data.result);
        if (resultKeys.length > 0) {
          const firstKey = resultKeys[0];
          const structuredData = apiResponse.data.result[firstKey];

          if (structuredData && structuredData.structured_fields) {
            const fields = structuredData.structured_fields;
            ////console.log("Fields: ", fields);

            grant = fields;
          }
        }
      }

      // Create fallback Grant if API data extraction failed
      grant = {
        OPPORTUNITY_NUMBER: grant.OPPORTUNITY_NUMBER || "Not Provided",
        OPPORTUNITY_ID: grant.OPPORTUNITY_ID || "Not Provided",
        OPPORTUNITY_NUMBER_LINK: grant.OPPORTUNITY_NUMBER_LINK || "Not Provided",
        OPPORTUNITY_TITLE: grant.OPPORTUNITY_TITLE || "Not Provided",
        AGENCY_CODE: grant.AGENCY_CODE || "Not Provided",
        AGENCY_NAME: grant.AGENCY_NAME || "Not Provided",
        CATEGORY_OF_FUNDING_ACTIVITY: grant.CATEGORY_OF_FUNDING_ACTIVITY || "Not Provided",
        FUNDING_CATEGORY_EXPLANATION: grant.FUNDING_CATEGORY_EXPLANATION || "Not Provided",
        FUNDING_INSTRUMENT_TYPE: grant.FUNDING_INSTRUMENT_TYPE || "Not Provided",
        ASSISTANCE_LISTINGS: grant.ASSISTANCE_LISTINGS || "Not Provided",
        ESTIMATED_TOTAL_FUNDING: grant.ESTIMATED_TOTAL_FUNDING || "Not Provided",
        EXPECTED_NUMBER_OF_AWARDS: grant.EXPECTED_NUMBER_OF_AWARDS || "Not Provided",
        AWARD_CEILING: grant.AWARD_CEILING || "Not Provided",
        AWARD_FLOOR: grant.AWARD_FLOOR || "Not Provided",
        COST_SHARING_MATCH_REQUIRMENT: grant.COST_SHARING_MATCH_REQUIRMENT || "Not Provided",
        LINK_TO_ADDITIONAL_INFORMATION: grant.LINK_TO_ADDITIONAL_INFORMATION || "Not Provided",
        GRANTOR_CONTACT: grant.GRANTOR_CONTACT || "Not Provided",
        GRANTOR_CONTACT_PHONE: grant.GRANTOR_CONTACT_PHONE || "Not Provided",
        GRANTOR_CONTACT_EMAIL: grant.GRANTOR_CONTACT_EMAIL || "Not Provided",
        ESTIMATED_POST_DATE: grant.ESTIMATED_POST_DATE || "Not Provided",
        ESTIMATED_APPLICATION_DUE_DATE: grant.ESTIMATED_APPLICATION_DUE_DATE || "Not Provided",
        POSTED_DATE: grant.POSTED_DATE || "Not Provided",
        CLOSE_DATE: grant.CLOSE_DATE || "Not Provided",
        OPPORTUNITY_STATUS: grant.OPPORTUNITY_STATUS || "Posted",
        FUNDING_DESCRIPTION: grant.FUNDING_DESCRIPTION || "Not Provided",
        ELIGIBLE_APPLICANTS: grant.ELIGIBLE_APPLICANTS || "Not Provided",
      };

      const newGrant = await Grant.create(grant);

      // Clean up: Delete the uploaded file from GridFS after processing
      try {
        await bucket.delete(req.file.id);
      } catch (deleteError) {
        // Log error but don't fail the request since RFP was already saved
        console.error('Failed to delete uploaded file from GridFS:', deleteError);
      }

      res.status(200).json({
        message: 'Grant extracted and saved successfully',
        grant: newGrant,
        fileInfo: {
          originalName: req.file.originalname,
          size: formatFileSize(req.file.size),
          type: req.file.mimetype
        }
      });

    } catch (err) {
      // Clean up: Delete the uploaded file from GridFS even if there's an error
      if (req.file) {
        try {
          const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
          });
          await bucket.delete(req.file.id);
        } catch (deleteError) {
          console.error('Failed to delete uploaded file from GridFS after error:', deleteError);
        }
      }

      // Handle specific error types
      if (err.response?.status === 422) {
        return res.status(422).json({
          error: 'File format not supported or invalid content',
          details: err.response.data
        });
      }

      if (err.response?.status === 400) {
        return res.status(400).json({
          error: 'Invalid request to Grant extraction service',
          details: err.response.data
        });
      }

      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        return res.status(503).json({ error: 'Grant extraction service is unavailable' });
      }

      // Generic error response
      res.status(500).json({
        error: err.message
      });
    }
  }
];

exports.saveGrant = async (req, res) => {
  try {
    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }

    const { grantId } = req.body;

    if (!grantId) {
      return res.status(400).json({ message: "Grant ID is required" });
    }

    const grant = await Grant.findOne({ _id: grantId });
    if (!grant) {
      return res.status(404).json({ message: "Grant not found" });
    }
    //console.log("Grant: ", grant);
    const new_SavedGrant = new SavedGrant({
      grantId: grant._id,
      userEmail: userEmail,
      grant_data: grant,
    });
    await new_SavedGrant.save();
    res.status(200).json({ message: "Grant saved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unsaveGrant = async (req, res) => {
  try {
    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }

    const { grantId } = req.body;
    if (!grantId) {
      return res.status(400).json({ message: "Grant ID is required" });
    }

    const grant = await SavedGrant.findOne({ userEmail: userEmail, grantId: grantId });
    if (!grant) {
      return res.status(404).json({ message: "Grant not found" });
    }
    await grant.deleteOne();
    res.status(200).json({ message: "Grant unsaved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.saveDraftGrant = async (req, res) => {
  try {
    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }

    const { grantId, formData } = req.body;
    const grant = await Grant.findOne({ email: userEmail, grantId: grantId });
    const new_DraftGrant = new DraftGrant({
      grantId: grant._id,
      email: userEmail,
      grant_data: grant.grant_data,
      project_inputs: formData,
      proposal: grant.generatedProposal || null,
    });
    await new_DraftGrant.save();
    res.status(200).json({ message: "Draft grant saved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unsaveDraftGrant = async (req, res) => {
  try {
    const { draftGrantId } = req.body;
    const draftGrant = await DraftGrant.findOne({ _id: draftGrantId });
    await draftGrant.deleteOne();
    res.status(200).json({ message: "Draft grant unsaved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRecentAndSavedGrants = async (req, res) => {
  try {
    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }

    // Get all grants for recommendations
    const recentGrants = await Grant.find().sort({ createdAt: -1 }).limit(15).lean();

    const savedGrants = await SavedGrant.find({ userEmail: userEmail }).sort({ createdAt: -1 }).lean();

    res.status(200).json({ recentGrants, savedGrants });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOtherGrants = async (req, res) => {
  try {
    const categories = req.body.category;
    const otherGrants = await Grant.find({ CATEGORY_OF_FUNDING_ACTIVITY: { $in: categories } });
    res.status(200).json(otherGrants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSavedAndDraftGrants = async (req, res) => {
  try {
    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }

    const savedGrants = await SavedGrant.find({ userEmail: userEmail }).sort({ createdAt: -1 }).lean();
    const savedGrants_1 = savedGrants.map((grant) => {
      return {
        ...grant.grant_data,
        _id: grant._id,
      };
    });


    const draftGrants = await DraftGrant.find({ userEmail: userEmail }).sort({ createdAt: -1 }).lean();
    const draftGrants_1 = draftGrants.map((grant) => {
      return {
        ...grant.grant_data,
        _id: grant._id,
        generatedProposal: grant.generatedProposal,
        currentEditor: grant.currentEditor,
      };
    });
    res.status(200).json({ savedGrants: savedGrants_1, draftGrants: draftGrants_1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendGrantDataForProposalGeneration = async (req, res) => {
  try {
    const { grant, formData } = req.body;

    // Validate grant object
    if (!grant) {
      return res.status(400).json({ error: 'Grant data is required' });
    }

    let userEmail = req.user.email;
    let companyProfile_1 = "";
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      if (!employeeProfile) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }
      userEmail = employeeProfile.companyMail;
      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });
    } else {
      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });
    }

    // Check if company profile exists
    if (!companyProfile_1) {
      return res.status(404).json({ error: 'Company profile not found. Please complete your company profile first.' });
    }

    const db = mongoose.connection.db;

    //Extract the company Documents from upload.chunks and save them in the companyProfile_1.companyDocuments
    const files = await db.collection('uploads.files')
      .find({ _id: { $in: companyProfile_1.documents.map(doc => doc.fileId) } })
      .toArray();

    // Check if files were found
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No uploaded files found. Please ensure all company documents are properly uploaded.' });
    }

    const filesWithBase64 = await Promise.all(
      files.map(async (file) => {
        const chunks = await db.collection('uploads.chunks')
          .find({ files_id: file._id })
          .sort({ n: 1 })
          .toArray();
        const fileBuffer = Buffer.concat(chunks.map(chunk => chunk.data.buffer));
        return {
          ...file,
          base64: fileBuffer.toString('base64'),
        };
      })
    );

    const filesMap = filesWithBase64.reduce((acc, file) => {
      acc[file._id.toString()] = file;
      return acc;
    }, {});

    // Check if all required files are available
    const missingFiles = companyProfile_1.documents.filter(doc => !filesMap[doc.fileId.toString()]);
    if (missingFiles.length > 0) {
      return res.status(400).json({
        error: 'Some company documents are missing or corrupted. Please re-upload the following documents: ' +
          missingFiles.map(doc => doc.name).join(', ')
      });
    }

    const companyDocuments_1 = companyProfile_1.documents.map((doc) => {
      return {
        [doc.name + "." + doc.type]: filesMap[doc.fileId.toString()].base64,
      };
    });

    const caseStudies_1 = (companyProfile_1.caseStudies || []).map((study) => {
      return {
        [study.title]: study.about,
      };
    });

    const pastProjects_1 = (companyProfile_1.proposals || []).map((project) => {
      return {
        name: project.title,
      };
    });

    const certifications_1 = (companyProfile_1.licensesAndCertifications || []).map((certification) => {
      return {
        name: certification.name,
        issuer: certification.issuer,
        validTill: certification.validTill,
      };
    });

    const employeeData_1 = (companyProfile_1.employees || []).map((employee) => {
      return {
        name: employee.name,
        jobTitle: employee.jobTitle,
        highestQualification: employee.highestQualification,
        skills: employee.skills,
        email: employee.email,
      };
    });

    const userData = {
      "_id": companyProfile_1._id,
      "email": companyProfile_1.email || "",
      "companyName": companyProfile_1.companyName || "",
      "companyOverview": companyProfile_1.bio || "",
      "yearOfEstablishment": companyProfile_1.establishedYear || "",
      "employeeCount": companyProfile_1.numberOfEmployees || 0,
      "services": companyProfile_1.services || [],
      "industry": companyProfile_1.industry || "",
      "location": companyProfile_1.location || "",
      "website": companyProfile_1.website || "",
      "linkedIn": companyProfile_1.linkedIn || "",
      "certifications": certifications_1,
      "documents": companyDocuments_1,
      "caseStudies": caseStudies_1,
      "pastProjects": pastProjects_1,
      "employees_information": employeeData_1,
      "awards": companyProfile_1.awards || [],
      "clientPortfolio": companyProfile_1.clients || [],
      "preferredIndustries": companyProfile_1.preferredIndustries || [],
      "pointOfContact": {
        "name": companyProfile_1.adminName || "",
        "email": companyProfile_1.email || "",
      }
    };

    // Check if there is any proposal in draft with the same grantId
    const draftProposal = await DraftGrant.findOne({ grantId: grant._id });
    if (draftProposal) {
      return res.status(200).json({ message: 'A proposal with the same Grant ID already exists in draft. Please edit the draft proposal instead of generating a new one.' });
    }

    // Check if there is any proposal in proposal tracker with the same grantId
    const proposalTracker = await ProposalTracker.findOne({ grantId: grant._id });
    if (proposalTracker) {
      //Initilize the api call to mlPipeline to know the status of the proposal generation
      const res_1 = await axios.post(`http://56.228.64.88:5000/get_grant_proposal_from_tracking_id/${proposalTracker.trackingId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      const res_data = res_1.data;
      if (res_data.status === "success") {
        const proposalData = res_1.data.proposal;
        const processedProposal = replaceTextInJson_Grant(grant_template_json, userData, grant, proposalData);
        const new_Proposal = new GrantProposal({
          grantId: grant._id,
          companyMail: userEmail,
          deadline: grant.ESTIMATED_APPLICATION_DUE_DATE || "Not Provided",
          initialProposal: processedProposal,
          generatedProposal: processedProposal,
          project_inputs: formData,
          status: "In Progress",
          submittedAt: new Date(),
          currentEditor: req.user._id,
        });
        await new_Proposal.save();

        const new_Draft = new DraftGrant({
          grantId: grant._id,
          userEmail: userEmail,
          grant: grant,
          generatedProposal: processedProposal,
          currentEditor: req.user._id,
        });
        await new_Draft.save();

        const new_CalendarEvent = new CalendarEvent({
          companyId: companyProfile_1._id,
          employeeId: req.user._id,
          proposalId: new_Proposal._id,
          grantId: grant._id,
          title: "Proposal Submission",
          startDate: new Date(),
          endDate: new Date(),
          status: "In Progress",
        });
        await new_CalendarEvent.save();

        const new_ProposalTracker = new ProposalTracker({
          grantId: grant._id,
          proposalId: new_Proposal._id,
          trackingId: res_data.trackingId,
          companyMail: userEmail,
          status: "success",
        });
        await new_ProposalTracker.save();

        return res.status(200).json({ message: 'Grant Proposal Generation completed successfully', proposal: processedProposal });
      } else if (res_data.status === "progress") {
        return res.status(200).json({ message: 'Grant Proposal Generation is already in progress. Please wait for it to complete.' });
      } else {
        return res.status(400).json({ error: 'Failed to generate grant proposal. Please try again later.' });
      }
    }

    const subscription = await Subscription.findOne({ userId: req.user._id });
    if (!subscription || subscription.end_date < new Date()) {
      return res.status(404).json({ error: 'Subscription not found or expired' });
    }

    const currentGrants = await GrantProposal.find({ companyMail: userEmail, createdAt: { $gte: subscription.start_date, $lte: subscription.end_date } }).countDocuments();
    if (subscription.max_grant_proposal_generations <= currentGrants) {
      return res.status(400).json({ error: 'You have reached the maximum number of grant proposals' });
    }

    const data = {
      user: userData,
      grant_data: grant,
      project_inputs: formData,
    };

    const res_1 = await axios.post(`http://56.228.64.88:5000/grant_proposal_generation`, data);
    const grant_result = res_1.data.grant_result;
    const grant_proposal_data = replaceTextInJson_Grant(grant_template_json, userData, grant, grant_result);
    const new_Proposal = new GrantProposal({
      grantId: grant._id,
      companyMail: userEmail,
      deadline: grant.ESTIMATED_APPLICATION_DUE_DATE || "Not Provided",
      initialProposal: grant_proposal_data || null,
      generatedProposal: grant_proposal_data || null,
      project_inputs: formData,
      status: "In Progress",
      submittedAt: new Date(),
      currentEditor: req.user._id,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      isSaved: false,
      savedAt: null,
      savedBy: null,
      restoreBy: null,
      restoredBy: null,
      restoredAt: null,
    });

    await new_Proposal.save();

    const new_Draft = new DraftGrant({
      grantId: grant._id,
      userEmail: userEmail,
      grant: grant,
      generatedProposal: grant_proposal_data,
      currentEditor: req.user._id,
    });
    await new_Draft.save();

    const new_CalendarEvent = new CalendarEvent({
      companyId: companyProfile_1._id,
      employeeId: req.user._id,
      proposalId: null,
      grantId: grant._id,
      title: "Proposal Submission",
      startDate: new Date(),
      endDate: new Date(),
      status: "In Progress",
    });

    await new_CalendarEvent.save();

    res.status(200).json(grant_proposal_data);
  } catch (err) {
    console.error('Error in /sendDataForProposalGeneration:', err);
    res.status(500).json({ error: 'Failed to send data for proposal generation' });
  }
};

exports.triggerGrant = async () => {
  try {
    const grants = await axios.get(`http://56.228.64.88:5000/grants/trigger`);
    const grant_data = await Grant.insertMany(grants);
  } catch (err) {
    console.error('Error in /triggerGrant:', err);
  }
};