require('dotenv').config();

const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const MatchedRFP = require('../models/MatchedRFP');
const RFP = require('../models/RFP');
const SavedRFP = require('../models/SavedRFP');
const GeneratedProposal = require('../models/GeneratedProposal');
const DraftRFP = require('../models/DraftRFP');
const EmployeeProfile = require('../models/EmployeeProfile');
const CompanyProfile = require('../models/CompanyProfile');
const axios = require('axios');
const fs = require('fs');

const { replaceTextInJson } = require('./json_replacer');
const path = require('path');
const template_json = path.join(__dirname, "template.json");

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
        title: rfp['RFP Title'] || '',
        description: rfp['RFP Description'] || '',
        logo: 'None',
        budget: rfp['Budget'] || 'Not found',
        deadline: rfp['Deadline'] || '',
        organization: rfp['Organization'] || rfp['Issuing Organization'] || '',
        fundingType: 'Government',
        organizationType: rfp['Industry'] || '',
        link: rfp['URL'] || '',
        contact: rfp['Contact Information'] || '',
        timeline: rfp['Timeline'] || '',
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
    let userEmail = req.user.email;
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
    }

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

    const draftRFPs_1 = await DraftRFP.find({ userEmail }).lean();
    const draftRFPs = draftRFPs_1.map((item) => {
      return {
        ...item.rfp,
        _id: item.rfpId,
      }
    });

    res.status(200).json({ savedRFPs, draftRFPs });
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
    let userEmail = req.user.email;
    let companyProfile_1 = "";
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });
    } else {
      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });
    }

    const db = mongoose.connection.db;

    //Extract the company Documents from upload.chunks and save them in the companyProfile_1.companyDocuments
    const files = await db.collection('uploads.files')
      .find({ _id: { $in: companyProfile_1.documents.map(doc => doc.fileId) } })
      .toArray();

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

    const companyDocuments_1 = (companyProfile_1.documents || []).map((doc) => {
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

    const rfp = {
      "RFP Title": proposal.title,
      "RFP Description": proposal.description,
      "Match Score": proposal.match,
      "Budget": proposal.budget,
      "Deadline": proposal.deadline,
      "Issuing Organization": proposal.organization || "Not found",
      "Industry": proposal.organizationType,
      "URL": proposal.link,
      "Contact Information": proposal.contact || '',
      "Timeline": proposal.timeline || '',
    };

    const userData = {
      "_id": companyProfile_1._id,
      "email": companyProfile_1.email,
      "companyName": companyProfile_1.companyName,
      "companyOverview": companyProfile_1.bio,
      "yearOfEstablishment": companyProfile_1.establishedYear,
      "employeeCount": companyProfile_1.numberOfEmployees,
      "services": companyProfile_1.services || [],
      "industry": companyProfile_1.industry,
      "location": companyProfile_1.location,
      "website": companyProfile_1.website,
      "linkedIn": companyProfile_1.linkedIn,
      "certifications": certifications_1,
      "documents": companyDocuments_1,
      "caseStudies": caseStudies_1,
      "pastProjects": pastProjects_1,
      "employees_information": employeeData_1,
      "awards": companyProfile_1.awards || [],
      "clientPortfolio": companyProfile_1.clients || [],
      "preferredIndustries": companyProfile_1.preferredIndustries || [],
      "pointOfContact": {
        "name": companyProfile_1.adminName,
        "email": companyProfile_1.email,
      }
    };

    const data = {
      user: userData,
      rfp: rfp,
    };

    const res_1 = await axios.post(`http://56.228.64.88:5000/run-proposal-generation`, data);

    const proposalData = res_1.data.proposal;

    const processedProposal = replaceTextInJson(template_json, proposalData, userData);

    const new_Proposal = new Proposal({
      rfpId: proposal._id,
      title: proposal.title,
      client: proposal.organization || "Not found",
      initialProposal: proposalData,
      generatedProposal: processedProposal,
      companyMail: userEmail,
      deadline: proposal.deadline,
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
      rfpId: proposal._id,
      rfp: { ...proposal },
      generatedProposal: processedProposal,
    });
    await new_Draft.save();

    res.status(200).json(processedProposal);
  } catch (err) {
    console.error('Error in /sendDataForProposalGeneration:', err);
    res.status(500).json({ error: 'Failed to send data for proposal generation' });
  }
};

exports.sendDataForRFPDiscovery = async (req, res) => {
  try {
    let userEmail = req.user.email;
    let companyProfile_1 = "";
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      userEmail = employeeProfile.companyMail;
      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });
    } else {
      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });
    }

    const db = mongoose.connection.db;

    //Extract the company Documents from upload.chunks and save them in the companyProfile_1.companyDocuments
    const files = await db.collection('uploads.files')
      .find({ _id: { $in: companyProfile_1.documents.map(doc => doc.fileId) } })
      .toArray();

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

    const companyDocuments_1 = (companyProfile_1.documents || []).map((doc) => {
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
      "email": companyProfile_1.email,
      "companyName": companyProfile_1.companyName,
      "companyOverview": companyProfile_1.bio,
      "yearOfEstablishment": companyProfile_1.establishedYear,
      "employeeCount": companyProfile_1.numberOfEmployees,
      "services": companyProfile_1.services || [],
      "industry": companyProfile_1.industry,
      "location": companyProfile_1.location,
      "website": companyProfile_1.website,
      "linkedIn": companyProfile_1.linkedIn,
      "certifications": certifications_1,
      "documents": companyDocuments_1,
      "caseStudies": caseStudies_1,
      "pastProjects": pastProjects_1,
      "employees_information": employeeData_1,
      "awards": companyProfile_1.awards || [],
      "clientPortfolio": companyProfile_1.clients || [],
      "preferredIndustries": companyProfile_1.preferredIndustries || [],
      "pointOfContact": {
        "name": companyProfile_1.adminName,
        "email": companyProfile_1.email,
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
          title: rfp['RFP Title'] || '',
          description: rfp['RFP Description'] || '',
          logo: 'None',
          match: rfp['Match Score'] || 0,
          budget: rfp['Budget'] || 'Not found',
          deadline: rfp['Deadline'] || '',
          organization: rfp['Organization'] || rfp['Issuing Organization'] || '',
          fundingType: 'Government',
          organizationType: rfp['Industry'] || '',
          link: rfp['URL'] || '',
          type: 'Matched',
          contact: rfp['Contact Information'] || '',
          timeline: rfp['Timeline'] || '',
          email: companyProfile_1.email
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

      console.log("API Response: ", apiResponse);

      console.log("API Response Data: ", apiResponse.data);

      // Extract RFP data from API response
      let rfp = null;
      if (apiResponse.data && apiResponse.data.result && typeof apiResponse.data.result === 'object') {
        const resultKeys = Object.keys(apiResponse.data.result);
        if (resultKeys.length > 0) {
          const firstKey = resultKeys[0];
          const structuredData = apiResponse.data.result[firstKey];

          if (structuredData && structuredData.structured_fields) {
            const fields = structuredData.structured_fields;
            console.log("Fields: ", fields);

            rfp = {
              title: fields['RFP Title'] || req.file.originalname.replace('.pdf', '').replace('.txt', ''),
              description: fields['RFP Description'] || `RFP extracted from uploaded file: ${req.file.originalname}`,
              organization: fields['Issuing Organization'] || 'Unknown',
              organizationType: fields['Industry'] || 'Unknown',
              link: fields['url'] || '',
              budget: fields['Budget or Funding Limit'] || 'Not specified',
              deadline: fields['Submission Deadline'] || 'Not specified',
              contact: fields['Contact Information'] || '',
              timeline: fields['Timeline / Project Schedule'] || '',
              proposalInstructions: fields['Proposal Submission Instructions'] || '',
              projectGoals: fields['Project Goals and Objectives'] || '',
              scopeOfWork: fields['Scope of Work'] || ''
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
          link: '',
          budget: 'Not specified',
          deadline: 'Not specified',
          contact: '',
          timeline: ''
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

      const newRFP = new MatchedRFP({
        title: rfp.title,
        description: enhancedDescription,
        organization: rfp.organization || '',
        organizationType: rfp.organizationType || '',
        link: rfp.link || '',
        email: userEmail,
        budget: rfp.budget || 'Not found',
        deadline: rfp.deadline || '',
        contact: rfp.contact || '',
        timeline: rfp.timeline || '',
        match: 100.00,
        logo: 'None',
        type: 'Uploaded',
      });

      await newRFP.save();

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







exports.getUsersData = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // Step 1: Fetch all proposals
    const proposals = await Proposal.find({ email: "test@draconx.com" }).lean();

    // Step 2: Gather all unique fileIds from proposals
    const allFileIds = proposals
      .flatMap(proposal => proposal.uploadedDocuments?.map(doc => doc.fileId) || [])
      .filter(Boolean);

    // Step 3: Fetch file metadata from GridFS
    const files = await db.collection('uploads.files')
      .find({ _id: { $in: allFileIds } })
      .toArray();

    // Step 4: Fetch file chunks and convert to base64
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

    // Step 5: Map fileId to its full metadata + base64
    const filesMap = filesWithBase64.reduce((acc, file) => {
      acc[file._id.toString()] = file;
      return acc;
    }, {});

    // Step 6: Attach enriched fileInfo to each uploadedDocument
    const enrichedProposals = proposals.map(proposal => {
      const enrichedDocs = (proposal.uploadedDocuments || []).map(doc => ({
        ...doc,
        fileInfo: filesMap[doc.fileId.toString()] || null,
      }));

      return {
        ...proposal,
        uploadedDocuments: enrichedDocs,
      };
    });

    // Step 7: Send full enriched data
    res.status(200).json(enrichedProposals);
  } catch (err) {
    console.error('Error in /getUsersData:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};

exports.matchedRFPData = async (req, res) => {
  try {
    const nestedRFPs = req.body;

    // if (!nestedRFPs || typeof nestedRFPs !== 'object' || Object.keys(nestedRFPs).length === 0) {
    //   return res.status(400).json({ error: 'Request body must be a non-empty object' });
    // }

    const transformedData = [];

    for (const [userId, rfpArray] of Object.entries(nestedRFPs)) {
      if (!Array.isArray(rfpArray)) continue;

      const user = await Proposal.findById(userId);
      if (!user || !user.email) {
        continue;
      }

      for (const rfp of rfpArray) {
        transformedData.push({
          title: rfp['RFP Title'] || '',
          description: rfp['RFP Description'] || '',
          logo: 'None',
          match: rfp['Match Score'] || 0,
          budget: rfp['Budget'] || 'Not found',
          deadline: rfp['Deadline'] || '',
          organization: rfp['Organization'] || rfp['Issuing Organization'] || '',
          fundingType: 'Government',
          organizationType: rfp['Industry'] || '',
          link: rfp['URL'] || '',
          type: 'Matched',
          contact: rfp['Contact Information'] || '',
          timeline: rfp['Timeline'] || '',
          email: user.email
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
      return res.status(400).json({ error: 'Each RFP must include all required fields' });
    }

    const result = await MatchedRFP.insertMany(transformedData);

    return res.status(201).json({
      message: 'Bulk RFP data saved successfully',
      insertedCount: result.length,
      data: result
    });

  } catch (err) {
    console.error('Error in /matchedRFPdata:', err);
    res.status(500).json({ error: 'Failed to save matched RFP data' });
  }
};

exports.getUserandRFPData = async (req, res) => {
  try {
    let email = "test@draconx.com";
    if (req.user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
      email = employeeProfile.companyMail;
    }

    // Step 1: Fetch all proposals and limit to 1
    const db = mongoose.connection.db;

    // Step 1: Fetch all proposals
    const proposals = await Proposal.find({ email: email }).lean();

    // Step 2: Gather all unique fileIds from proposals
    const allFileIds = proposals
      .flatMap(proposal => proposal.uploadedDocuments?.map(doc => doc.fileId) || [])
      .filter(Boolean);

    // Step 3: Fetch file metadata from GridFS
    const files = await db.collection('uploads.files')
      .find({ _id: { $in: allFileIds } })
      .toArray();

    // Step 4: Fetch file chunks and convert to base64
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

    // Step 5: Map fileId to its full metadata + base64
    const filesMap = filesWithBase64.reduce((acc, file) => {
      acc[file._id.toString()] = file;
      return acc;
    }, {});

    // Step 6: Attach enriched fileInfo to each uploadedDocument
    const enrichedProposals = proposals.map(proposal => {
      const enrichedDocs = (proposal.uploadedDocuments || []).map(doc => ({
        ...doc,
        fileInfo: filesMap[doc.fileId.toString()] || null,
      }));

      return {
        ...proposal,
        uploadedDocuments: enrichedDocs,
      };
    });

    const RFP = await MatchedRFP.find({ email: email }).sort({ createdAt: -1 });

    const data_1 = {
      "RFP Title": RFP[0].title,
      "RFP Description": RFP[0].description,
      "Match Score": RFP[0].match,
      "Budget": RFP[0].budget,
      "Deadline": RFP[0].deadline,
      "Issuing Organization": RFP[0].organization,
      "Industry": RFP[0].organizationType,
      "URL": RFP[0].link,
      "Contact Information": RFP[0].contact || '',
      "Timeline": RFP[0].timeline || '',
    };

    // const User = await Proposal.find({ email: email }).sort({ createdAt: -1 }).limit(1).lean();
    if (!RFP || RFP.length === 0) {
      return res.status(404).json({ message: "No proposals found for this user." });
    }

    const data = {
      user: enrichedProposals[0], // Get the first user
      rfp: data_1 // Get the first proposal
    };

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching user and RFP data:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

exports.generatedProposal = async (req, res) => {
  try {
    const {
      "Cover Letter": coverLetter,
      "Executive Summary": executiveSummary,
      "Project Plan": projectPlan,
      "Partnership Overview": partnershipOverview,
      "References & Proven Results": referencesAndProvenResults,
      email,
      rfpTitle,
    } = req.body;

    // Manual validation
    if (
      !coverLetter ||
      !executiveSummary ||
      !projectPlan ||
      !partnershipOverview ||
      !referencesAndProvenResults ||
      !email ||
      !rfpTitle
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newProposal = new GeneratedProposal({
      coverLetter,
      executiveSummary,
      projectPlan,
      partnershipOverview,
      referencesAndProvenResults,
      email,
      rfpTitle,
    });

    await newProposal.save();
    res.status(201).json({ message: "Proposal submitted successfully" });
  } catch (err) {
    console.error('Error in /generateProposal:', err);
    res.status(500).json({ error: 'Failed to generate proposal' });
  }
};