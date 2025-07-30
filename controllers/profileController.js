require('dotenv').config();

const mongoose = require("mongoose");
const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const EmployeeProfile = require("../models/EmployeeProfile");
const Proposal = require("../models/Proposal");
const { GridFsStorage } = require("multer-gridfs-storage");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { randomInt } = require("crypto");
const path = require("path");
const multer = require("multer");

const storage = new GridFsStorage({
    url: process.env.MONGO_URI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) return reject(err);
                const filename = buf.toString("hex") + path.extname(file.originalname);
                resolve({
                    filename,
                    bucketName: "uploads",
                    metadata: { originalname: file.originalname },
                });
            });
        });
    },
});

const upload = multer({ storage });
const multiUpload = upload.fields([
    { name: "documents", maxCount: 10 },
    { name: "proposals", maxCount: 10 },
]);

const singleLogoUpload = upload.single('logo');
const singleCaseStudyUpload = upload.single('file');
const singleDocumentUpload = upload.single('document');

// function generateStrongPassword(length = randomInt(8, 12)) {
//   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
//   const bytes = crypto.randomBytes(length);
//   let password = '';

//   for (let i = 0; i < bytes.length; i++) {
//     password += chars[bytes[i] % chars.length];
//   }

//   return password;
// }

function generateStrongPassword(length = randomInt(8, 12)) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = uppercase + lowercase + digits + special;

  if (length < 8) throw new Error("Password length must be at least 8 characters");

  // Ensure one uppercase and one special character
  let password = '';
  password += uppercase[randomInt(0, uppercase.length)];
  password += special[randomInt(0, special.length)];

  // Fill the rest of the password
  const remainingLength = length - 2;
  const bytes = crypto.randomBytes(remainingLength);

  for (let i = 0; i < remainingLength; i++) {
    password += allChars[bytes[i] % allChars.length];
  }

  // Shuffle the password so required chars are not always at the beginning
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const companyProfile = await CompanyProfile.findOne({ userId: req.user._id });
        if (!companyProfile) {
            return res.status(404).json({ message: "Company profile not found" });
        }
        const data = {
            companyName: companyProfile.companyName,
            industry: companyProfile.industry,
            location: companyProfile.location,
            email: user.email,
            phone: user.mobile,
            linkedIn: companyProfile.linkedIn,
            bio: companyProfile.bio,
            website: companyProfile.website,
            services: companyProfile.services,
            establishedYear: companyProfile.establishedYear,
            numberOfEmployees: companyProfile.numberOfEmployees,
            caseStudies: companyProfile.caseStudies,
            licensesAndCertifications: companyProfile.licensesAndCertifications,
            employees: companyProfile.employees,
            logoUrl: companyProfile.logoUrl,
            documents: companyProfile.documents,
        };
        const Proposals = await Proposal.find({ companyId: req.user._id });
        const totalProposals = Proposals.length;
        const wonProposals = Proposals.filter(proposal => proposal.status === "Won").length;
        const successRate = totalProposals === 0 ? "0.00" : ((wonProposals / totalProposals) * 100).toFixed(2);
        const data_1 = {
            ...data,
            totalProposals,
            activeProposals: Proposals.filter(proposal => proposal.status === "In Progress").length,
            wonProposals,
            successRate,
        };
        res.status(200).json(data_1);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getEmployeeProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role !== "employee") {
            return res.status(403).json({ message: "You are not authorized to view this profile" });
        }

        const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
        if (!employeeProfile) {
            return res.status(404).json({ message: "Employee profile not found" });
        }

        const data = {
            name: employeeProfile.name,
            jobTitle: employeeProfile.jobTitle,
            accessLevel: employeeProfile.accessLevel,
            companyName: employeeProfile.companyName,
            email: user.email,
            phone: user.mobile,
            location: employeeProfile.location,
            highestQualification: employeeProfile.highestQualification,
            skills: employeeProfile.skills,
            logoUrl: employeeProfile.logoUrl,
        };
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.uploadLogo = [
    singleLogoUpload,
    async (req, res) => {
        try {
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            console.log(user.role);
            console.log(req.file);

            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }
            // Construct the file URL (assuming a /file/:id route exists for serving GridFS files)
            const logoUrl = `${req.file.id}`;
            // Update the company profile with the new logo URL
            if (user.role === "company") {
                await CompanyProfile.findOneAndUpdate(
                    { userId: req.user._id },
                    { logoUrl },
                    { new: true }
                );
            } else {
                await EmployeeProfile.findOneAndUpdate(
                    { userId: req.user._id },
                    { logoUrl },
                    { new: true }
                );
            }
            res.status(200).json({ logoUrl });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

exports.updateCompanyProfile = [
    multiUpload,
    async (req, res) => {
        try {
            const { companyName, industry, location, linkedIn, website, email, phone, services, establishedYear, numberOfEmployees, bio } = req.body;
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            if (user.role !== "company") {
                return res.status(403).json({ message: "You are not authorized to update this profile" });
            }
            user.email = email;
            user.mobile = phone;
            await user.save();

            let parsedServices = [];
            console.log(services);
            console.log(typeof services);
            if (typeof services === "string") {
                try {
                    parsedServices = JSON.parse(services);
                    if (!Array.isArray(parsedServices)) parsedServices = [];
                } catch {
                    parsedServices = [];
                }
            }

            const companyProfile = await CompanyProfile.findOneAndUpdate(
                { userId: req.user._id },
                { email, companyName, industry, location, linkedIn, website, services: parsedServices, establishedYear, numberOfEmployees, bio },
                { new: true }
            );
            res.status(200).json({ message: "Company profile updated successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

exports.updateEmployeeProfile =  async (req, res) => {
    try {
        const { name, email, location, phone, highestQualification, skills } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "employee") {
            return res.status(403).json({ message: "You are not authorized to update this profile" });
        }

        user.email = email;
        user.mobile = phone;
        await user.save();

        const employeeProfile = await EmployeeProfile.findOneAndUpdate(
            { userId: req.user._id },
            { name, email, location, phone, highestQualification, skills },
            { new: true }
        );

        const companyProfile = await CompanyProfile.findOne({ userId: employeeProfile.companyMail });
        if (companyProfile) {
            const employeeIndex = companyProfile.employees.findIndex(emp => emp.email === email);
            if (employeeIndex !== -1) {
                companyProfile.employees[employeeIndex].name = name;
                companyProfile.employees[employeeIndex].email = email;
                companyProfile.employees[employeeIndex].phone = phone;
                companyProfile.employees[employeeIndex].highestQualification = highestQualification;
                companyProfile.employees[employeeIndex].skills = skills;
                await companyProfile.save();
            }
        }
        res.status(200).json({ message: "Employee profile updated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addEmployee = async (req, res) => {
    try {
        const { name, email, phone, shortDesc, highestQualification, skills, jobTitle, accessLevel } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "company") {
            return res.status(403).json({ message: "You are not authorized to add an employee" });
        }

        if (accessLevel == "Member") {
            const companyProfile = await CompanyProfile.findOneAndUpdate(
                { userId: req.user._id },
                {
                    $push: {
                        employees: {
                            name: name,
                            email: email,
                            phone: phone,
                            shortDesc: shortDesc,
                            highestQualification: highestQualification,
                            skills: skills,
                            jobTitle: jobTitle,
                            accessLevel: accessLevel,
                        }
                    }
                }
            );
        } else {
            const user_1 = await User.findOne({ email });
            if (!user_1) {
                console.log("User not found");
                // const password = crypto.randomBytes(16).toString("hex");
                const password = generateStrongPassword();
                console.log("Password generated: ", password);
                const hashedPassword = await bcrypt.hash(password, 10);
                const user_2 = await User.create({ fullName: name, email, mobile: phone, password: hashedPassword, role: "employee" });
                console.log("User created");
                const employeeProfile = new EmployeeProfile({ userId: user_2._id, name, email, phone, about: shortDesc, highestQualification, skills, jobTitle, accessLevel, companyMail: user.email });
                await employeeProfile.save();
                console.log("Employee profile created");
            } else {
                console.log("User found");
                const employeeProfile = await EmployeeProfile.findOne({ userId: user_1._id });
                if (employeeProfile) {
                    console.log("Employee profile found");
                    employeeProfile.name = name;
                    employeeProfile.email = email;
                    employeeProfile.phone = phone;
                    employeeProfile.about = shortDesc;
                    employeeProfile.jobTitle = jobTitle;
                    employeeProfile.skills = skills;
                    employeeProfile.highestQualification = highestQualification;
                    employeeProfile.accessLevel = accessLevel;
                    employeeProfile.companyMail = user.email;
                    await employeeProfile.save();
                    console.log("Employee profile updated");
                } else {
                    console.log("Employee profile not found");
                    const employeeProfile = new EmployeeProfile({ userId: user_1._id, name, email, phone, shortDesc, highestQualification, skills, jobTitle, accessLevel, companyMail: user.email });
                    await employeeProfile.save();
                    console.log("Employee profile created");
                }
            }

            const employeeProfile = await EmployeeProfile.findOne({ email });
            const companyProfile = await CompanyProfile.findOneAndUpdate(
                { userId: req.user._id },
                {
                    $push: {
                        employees: {
                            employeeProfile: employeeProfile._id,
                            name: employeeProfile.name,
                            email: employeeProfile.email,
                            phone: employeeProfile.phone,
                            shortDesc: employeeProfile.shortDesc,
                            highestQualification: employeeProfile.highestQualification,
                            skills: employeeProfile.skills,
                            jobTitle: employeeProfile.jobTitle,
                            accessLevel: employeeProfile.accessLevel
                        }
                    }
                },
                { new: true }
            );
        }

        res.status(200).json({ message: "Employee added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addCaseStudy = [
    singleCaseStudyUpload,
    async (req, res) => {
        try {
            const { title, description, readTime } = req.body;
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            if (user.role !== "company") {
                return res.status(403).json({ message: "You are not authorized to add a case study" });
            }
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            // Construct the file URL for the uploaded case study file
            const fileUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/profile/getCaseStudy/${req.file.id}`;

            console.log("Adding case study");
            const companyProfile = await CompanyProfile.findOneAndUpdate(
                { userId: req.user._id },
                {
                    $push: {
                        caseStudies: {
                            title,
                            about: description, // Map 'description' to 'about' field
                            readTime,
                            fileUrl
                        }
                    }
                },
                { new: true }
            );
            console.log("Case study added successfully");
            res.status(200).json({ message: "Case study added successfully" });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: error.message });
        }
    }
];

exports.addLicenseAndCertification = async (req, res) => {
    try {
        const { name, issuer, validTill } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const companyProfile = await CompanyProfile.findOneAndUpdate(
            { userId: req.user._id },
            { $push: { licensesAndCertifications: { name, issuer, validTill } } },
            { new: true }
        );
        res.status(200).json({ message: "License and certification added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addDocument = [
    singleDocumentUpload,
    async (req, res) => {
        try {
            const { name, type } = req.body;
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            if (user.role !== "company") {
                return res.status(403).json({ message: "You are not authorized to add documents" });
            }
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            // Construct the file URL for the uploaded document
            const fileUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/profile/getDocument/${req.file.id}`;

            console.log("Adding document");
            const companyProfile = await CompanyProfile.findOneAndUpdate(
                { userId: req.user._id },
                {
                    $push: {
                        documents: {
                            name: name || req.file.originalname,
                            type: type || "PDF",
                            size: req.file.size,
                            url: fileUrl,
                            fileId: req.file.id
                        }
                    }
                },
                { new: true }
            );
            console.log("Document added successfully");
            res.status(200).json({ message: "Document added successfully" });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: error.message });
        }
    }
];

exports.getProfileImage = async (req, res) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "uploads",
        });
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const downloadStream = bucket.openDownloadStream(fileId);
        downloadStream.on("error", () => res.status(404).send("File not found"));
        downloadStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCaseStudy = async (req, res) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "uploads",
        });
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const downloadStream = bucket.openDownloadStream(fileId);
        downloadStream.on("error", () => res.status(404).send("File not found"));
        downloadStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getDocument = async (req, res) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "uploads",
        });
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const downloadStream = bucket.openDownloadStream(fileId);
        downloadStream.on("error", () => res.status(404).send("File not found"));
        downloadStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};