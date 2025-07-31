require('dotenv').config();

const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const MatchedRFP = require('../models/MatchedRFP');
const RFP = require('../models/RFP');
const SavedRFP = require('../models/SavedRFP');
const GeneratedProposal = require('../models/GeneratedProposal');
const DraftRFP = require('../models/DraftRFP');
const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const CompanyProfile = require('../models/CompanyProfile');
const axios = require('axios');

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
        console.warn(`Skipping user ID ${userId}: Proposal not found or missing email.`);
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

exports.getAllRFP = async (req, res) => {
  try {
    const userEmail = req.user.email;
    console.log("Email: ", userEmail);

    // Universal RFPs from a separate RFPs collection (not user-specific)
    const allRFPs = await RFP.find({}).lean();
    console.log("ALL RFP's : ", allRFPs);

    // Recommended: from matched RFPs with match >= 85, sorted by latest
    const recommendedRFPs = await MatchedRFP.find({ email: userEmail, match: { $gte: 60 } })
      .sort({ createdAt: -1 })
      .lean();
    console.log("Recommended RFP's : ", recommendedRFPs);

    // Saved: from SavedRFPs
    const savedRFPs_1 = await SavedRFP.find({ userEmail }).lean();
    const savedRFPs = savedRFPs_1.map((item) => {
      const { type_, ...restRFP } = item.rfp;
      return {
        ...item,
        rfp: {
          ...restRFP,
          type: type_,
          _id: item.rfpId,
        },
      };
    });

    res.status(200).json({
      allRFPs,
      recommendedRFPs,
      recentRFPs: [], // Placeholder, criteria not defined yet
      savedRFPs: savedRFPs.map(item => item.rfp),
    });
  } catch (err) {
    console.error('Error in /getAllRFP:', err);
    res.status(500).json({ error: 'Failed to load RFPs' });
  }
};

exports.save = async (req, res) => {
  try {
    const userEmail = req.user.email;
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
      match: rfp.match,
      budget: rfp.budget,
      deadline: rfp.deadline,
      organization: rfp.organization,
      fundingType: rfp.fundingType,
      organizationType: rfp.organizationType,
      link: rfp.link,
      type_: rfp.type,
    };

    const newSave = await SavedRFP.create({ userEmail, rfpId, rfp: cleanRFP });
    res.status(201).json({ message: 'RFP saved successfully', saved: newSave });
  } catch (err) {
    console.error('Error in /saveRFP:', err);
    res.status(500).json({ error: 'Failed to save RFP' });
  }
};

exports.unsave = async (req, res) => {
  try {
    const userEmail = req.user.email;
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

exports.getSavedAndDraftRFPs = async (req, res) => {
  try {
    const userEmail = req.user.email;

    const savedRFPs_1 = await SavedRFP.find({ userEmail }).lean();
    const savedRFPs = savedRFPs_1.map((item) => {
      const { type_, ...restRFP } = item.rfp;
      return {
        ...item,
        rfp: {
          ...restRFP,
          type: type_,
          _id: item.rfpId,
        },
      };
    });

    const draftRFPs_1 = await DraftRFP.find({ userEmail }).lean();
    const draftRFPs = draftRFPs_1.map((item) => {
      const { type_, ...restRFP } = item.rfp;
      return {
        ...item,
        rfp: {
          ...restRFP,
          type: type_,
          _id: item.rfpId,
        },
      };
    });

    res.status(200).json({ savedRFPs, draftRFPs });
  } catch (err) {
    console.error('Error in /getSavedAndDraftRFPs:', err);
    res.status(500).json({ error: 'Failed to get saved and draft RFPs' });
  }
};

exports.saveDraftRFP = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { rfpId, rfp } = req.body;

    const existing = await DraftRFP.findOne({ userEmail, rfpId });
    if (existing) {
      return res.status(200).json({ message: 'Already saved' });
    }

    const cleanRFP = {
      title: rfp.title,
      description: rfp.description,
      logo: rfp.logo,
      match: rfp.match,
      budget: rfp.budget,
      deadline: rfp.deadline,
      organization: rfp.organization,
      fundingType: rfp.fundingType,
      organizationType: rfp.organizationType,
      link: rfp.link,
      type_: rfp.type,
    };

    const newDraft = await DraftRFP.create({ userEmail, rfpId, rfp: cleanRFP });
    res.status(201).json({ message: 'RFP saved successfully', saved: newDraft });
  } catch (err) {
    console.error('Error in /saveDraftRFP:', err);
    res.status(500).json({ error: 'Failed to save draft RFP' });
  }
};

exports.getUserandRFPData = async (req, res) => {
  try {
    const email = "test@draconx.com";

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

exports.sendDataForProposalGeneration = async (req, res) => {
  try {
    const { proposal } = req.body;
    const userEmail = req.user.email;
    const user = await User.findOne({ email: userEmail });
    let companyProfile_1 = "";
    let companyMail = "";
    if (user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: user._id });
      companyMail = employeeProfile.companyMail;
      companyProfile_1 = await CompanyProfile.findOne({ email: companyMail });
    } else {
      companyProfile_1 = await CompanyProfile.findOne({ email: userEmail });
    }

    // console.log("Proposal: ", proposal);
    // console.log("Company Profile: ", companyProfile_1);

    const db = mongoose.connection.db;

    //Extract the company Documents from upload.chunks and save them in the companyProfile_1.companyDocuments
    const files = await db.collection('uploads.files')
      .find({ _id: { $in: companyProfile_1.documents.map(doc => doc.fileId) } })
      .toArray();

    // console.log("Files: ", files);


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

    // console.log("Company Documents: ", companyDocuments_1);

    const caseStudies_1 = (companyProfile_1.caseStudies || []).map((study) => {
      return {
        [study.title]: study.about,
      };
    });

    // console.log("Case Studies: ", caseStudies_1);

    const pastProjects_1 = (companyProfile_1.proposals || []).map((project) => {
      return {
        name: project.title,
      };
    });

    // console.log("Past Projects: ", pastProjects_1);

    const certifications_1 = (companyProfile_1.licensesAndCertifications || []).map((certification) => {
      return {
        name: certification.name,
        issuer: certification.issuer,
        validTill: certification.validTill,
      };
    });

    // console.log("Certifications: ", certifications_1);

    const employeeData_1 = (companyProfile_1.employees || []).map((employee) => {
      return {
        name: employee.name,
        jobTitle: employee.jobTitle,
        highestQualification: employee.highestQualification,
        skills: employee.skills,
        email: employee.email,
      };
    });

    // console.log("Employee Data: ", employeeData_1);

    const rfp = {
      "RFP Title": proposal.title,
      "RFP Description": proposal.description,
      "Match Score": proposal.match,
      "Budget": proposal.budget,
      "Deadline": proposal.deadline,
      "Issuing Organization": proposal.organization,
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

    console.log("User Data: ", userData);
    console.log("RFP: ", rfp);

    const data = {
      user: userData,
      rfp: rfp,
    };

    const res_1 = await axios.post(`http://56.228.64.88:5000/run-proposal-generation`, data);
    console.log("Response from proposal generation API: ", res_1.data);

    res.status(200).json(res_1.data);
  } catch (err) {
    console.error('Error in /sendDataForProposalGeneration:', err);
    res.status(500).json({ error: 'Failed to send data for proposal generation' });
  }
};