require('dotenv').config();

const mongoose = require("mongoose");
const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const EmployeeProfile = require("../models/EmployeeProfile");
const Proposal = require("../models/Proposal");
const GrantProposal = require("../models/GrantProposal");
const { GridFsStorage } = require("multer-gridfs-storage");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { randomInt } = require("crypto");
const multer = require("multer");
const nodemailer = require("nodemailer");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payments");
const { summarizePdfBuffer, summarizePdf } = require("../utils/documentSummarizer");

const storage = new GridFsStorage({
    url: process.env.MONGO_URI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) return reject(err);
                // const filename = buf.toString("hex") + path.extname(file.originalname);
                resolve({
                    filename: file.originalname,
                    bucketName: "uploads",
                    metadata: { originalname: file.originalname },
                });
            });
        });
    },
});


// Utility function to send email and await until mail is sent
async function sendEmail(email, password) {
    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {

                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        //   transporter.verify((error, success) => {
        //       if (error) {
        //         console.error("SMTP connection error:", error);
        //       } else {
        //         //console.log("SMTP server is ready to take messages");
        //       }
        //     });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Welcome to the team",
            text: `Your password is: ${password}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                //console.log(error);
                reject(error);
            } else {
                //console.log("Email sent: " + info.response);
                resolve(info);
            }
        });
    });
}


const passwordValidator = (password) => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (password.length < 8) return false;
    if (!uppercase.includes(password)) return false;
    if (!lowercase.includes(password)) return false;
    if (!digits.includes(password)) return false;
    if (!special.includes(password)) return false;
    return true;
}


const upload = multer({ storage });
const multiUpload = upload.fields([
    { name: "documents", maxCount: 10 },
    { name: "proposals", maxCount: 10 },
]);

const singleLogoUpload = upload.single('logo');
const singleCaseStudyUpload = upload.single('file');
const singleDocumentUpload = upload.single('document');

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
            adminName: companyProfile.adminName,
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
            awards: companyProfile.awards,
            clients: companyProfile.clients,
            preferredIndustries: companyProfile.preferredIndustries,
        };
        const Proposals = await Proposal.find({ companyMail: companyProfile.email });
        const GrantProposals = await GrantProposal.find({ companyMail: companyProfile.email });
        const totalProposals = Proposals.length + GrantProposals.length;
        const wonProposals = Proposals.filter(proposal => proposal.status === "Won").length + GrantProposals.filter(proposal => proposal.status === "Won").length;
        const successRate = totalProposals === 0 ? "0.00" : ((wonProposals / totalProposals) * 100).toFixed(2);
        const data_1 = {
            ...data,
            totalProposals,
            activeProposals: Proposals.filter(proposal => proposal.status === "In Progress").length + GrantProposals.filter(proposal => proposal.status === "In Progress").length,
            wonProposals,
            successRate,
            proposals: [...Proposals, ...GrantProposals],
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

        const companyProfile = await CompanyProfile.findOne({ email: employeeProfile.companyMail });
        if (!companyProfile) {
            return res.status(404).json({ message: "Company profile not found" });
        }

        const data = {
            name: employeeProfile.name,
            jobTitle: employeeProfile.jobTitle,
            accessLevel: employeeProfile.accessLevel,
            companyName: companyProfile.companyName,
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

exports.getCompanyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
        const companyProfile = await CompanyProfile.findOne({ email: employeeProfile.companyMail });
        if (!companyProfile) {
            return res.status(404).json({ message: "Company profile not found" });
        }

        const Proposals = await Proposal.find({ companyMail: companyProfile.email });
        const GrantProposals = await GrantProposal.find({ companyMail: companyProfile.email });
        const requiredData = {
            companyName: companyProfile.companyName,
            adminName: companyProfile.adminName,
            industry: companyProfile.industry,
            bio: companyProfile.bio,
            employees: companyProfile.employees,
            proposals: [...Proposals, ...GrantProposals],
            caseStudies: companyProfile.caseStudies,
        };

        res.status(200).json(requiredData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getProposals = async (req, res) => {
    try {
        let userEmail = req.user.email;
        let companyMail = "";

        if (req.user.role === "company") {
            companyMail = userEmail;
        }
        else {
            const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id });
            companyMail = employeeProfile.companyMail;
        }

        const proposals = await Proposal.find({ companyMail: companyMail }).populate("currentEditor", "_id fullName email");
        const grantProposals = await GrantProposal.find({ companyMail: companyMail }).populate("currentEditor", "_id fullName email");

        const finalProposals = [...proposals, ...grantProposals];
        res.status(200).json(finalProposals);
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

            //console.log(user.role);
            //console.log(req.file);

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
            const { companyName, industry, location, linkedIn, website, email, phone, services, establishedYear, numberOfEmployees, bio, awards, clients, preferredIndustries, adminName } = req.body;
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
            //console.log(services);
            //console.log(typeof services);
            if (typeof services === "string") {
                try {
                    parsedServices = JSON.parse(services);
                    if (!Array.isArray(parsedServices)) {
                        parsedServices = [];
                    }
                } catch {
                    parsedServices = [];
                }
            }

            let parsedAwards = [];
            let parsedClients = [];

            if (typeof awards === "string") {
                try {
                    parsedAwards = JSON.parse(awards);
                    if (!Array.isArray(parsedAwards)) {
                        parsedAwards = [];
                    }
                } catch {
                    parsedAwards = [];
                }
            }

            if (typeof clients === "string") {
                try {
                    parsedClients = JSON.parse(clients);
                    if (!Array.isArray(parsedClients)) {
                        parsedClients = [];
                    }
                } catch {
                    parsedClients = [];
                }
            }

            let parsedPreferredIndustries = [];
            if (typeof preferredIndustries === "string") {
                try {
                    parsedPreferredIndustries = JSON.parse(preferredIndustries);
                    if (!Array.isArray(parsedPreferredIndustries)) {
                        parsedPreferredIndustries = [];
                    }
                } catch {
                    parsedPreferredIndustries = [];
                }
            }

            const companyProfile = await CompanyProfile.findOneAndUpdate(
                { userId: req.user._id },
                { email, companyName, adminName, industry, location, linkedIn, website, services: parsedServices, establishedYear, numberOfEmployees, bio, awards: parsedAwards, clients: parsedClients, preferredIndustries: parsedPreferredIndustries },
                { new: true }
            );
            res.status(200).json({ message: "Company profile updated successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

exports.updateEmployeeProfile = [
    upload.none(),
    async (req, res) => {
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
            user.fullName = name;
            await user.save();

            const employeeProfile = await EmployeeProfile.findOneAndUpdate(
                { userId: req.user._id },
                { name, email, location, phone, highestQualification, skills },
                { new: true }
            );

            const companyProfile = await CompanyProfile.findOne({ email: employeeProfile.companyMail });
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
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

const addEmployeeToCompanyProfile = async (req, employeeProfile) => {
    const companyProfile_1 = await CompanyProfile.findOneAndUpdate(
        { userId: req.user._id },
        {
            $push: {
                employees: {
                    employeeId: employeeProfile._id,
                    name: employeeProfile.name,
                    email: employeeProfile.email,
                    phone: employeeProfile.phone,
                    shortDesc: employeeProfile.about,
                    highestQualification: employeeProfile.highestQualification,
                    skills: employeeProfile.skills,
                    jobTitle: employeeProfile.jobTitle,
                    accessLevel: employeeProfile.accessLevel
                }
            }
        },
        { new: true }
    );
    await companyProfile_1.save();
}


exports.addEmployee = async (req, res) => {
    try {
        const { name, email, phone, shortDesc, highestQualification, skills, jobTitle, accessLevel } = req.body;

        if (!name || !email || !phone || !shortDesc || !highestQualification || !skills || !jobTitle || !accessLevel) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "company") {
            return res.status(403).json({ message: "You are not authorized to add an employee" });
        }

        if (accessLevel == "Member") {
            const companyProfile = await CompanyProfile.findOne({ userId: req.user._id });
            if (companyProfile.employees.some(emp => emp.email === email)) {
                return res.status(400).json({ message: "Employee already exists in company profile" });
            }
            const employeeProfile = {
                name,
                email,
                phone,
                about: shortDesc,
                highestQualification,
                skills,
                jobTitle,
                accessLevel,
                employeeId: new mongoose.Types.ObjectId(),
            };
            await addEmployeeToCompanyProfile(req, employeeProfile);
            //console.log("Employee added to company profile");
        } else {
            const subscription = await Subscription.findOne({ userId: req.user._id });
            const companyProfile = await CompanyProfile.findOne({ userId: req.user._id });
            if (!companyProfile) {
                return res.status(404).json({ message: "Company profile not found" });
            }
            if (companyProfile.employees.some(emp => emp.email === email)) {
                return res.status(400).json({ message: "Employee already exists in company profile" });
            }
            const noOfEditors = companyProfile.employees.filter(emp => emp.accessLevel === "Editor").length;
            const noOfViewers = companyProfile.employees.filter(emp => emp.accessLevel === "Viewer").length;
            if (!subscription || subscription.end_date < new Date()) {
                return res.status(404).json({ message: "Subscription not found" });
            }
            if (accessLevel === "Editor" && subscription.max_editors <= noOfEditors) {
                return res.status(400).json({ message: "You have reached the maximum number of editors" });
            }
            if (accessLevel === "Viewer" && subscription.max_viewers <= noOfViewers) {
                return res.status(400).json({ message: "You have reached the maximum number of viewers" });
            }
            const user_1 = await User.findOne({ email });
            if (!user_1) {
                //console.log("User not found");
                const password = generateStrongPassword();
                //console.log("Password generated: ", password);
                const hashedPassword = await bcrypt.hash(password, 10);
                const user_2 = await User.create({ fullName: name, email, mobile: phone, password: hashedPassword, role: "employee" });
                //console.log("User created");
                const employeeProfile = new EmployeeProfile({ userId: user_2._id, name, email, phone, about: shortDesc, highestQualification, skills, jobTitle, accessLevel, companyMail: user.email });
                await employeeProfile.save();
                await sendEmail(email, password);
                //console.log("Employee profile created");
                await addEmployeeToCompanyProfile(req, employeeProfile);
            } else {
                //console.log("User found");
                const employeeProfile = await EmployeeProfile.findOne({ userId: user_1._id });
                if (employeeProfile) {
                    //console.log("Employee profile found");
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
                    //console.log("Employee profile updated");
                    await addEmployeeToCompanyProfile(req, employeeProfile);
                } else {
                    //console.log("Employee profile not found");
                    const employeeProfile = new EmployeeProfile({ userId: user_1._id, name, email, phone, about: shortDesc, highestQualification, skills, jobTitle, accessLevel, companyMail: user.email });
                    await employeeProfile.save();
                    //console.log("Employee profile created");
                    await addEmployeeToCompanyProfile(req, employeeProfile);
                }
            }
        }
        res.status(201).json({ message: "Employee added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.removeEmployee = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "company") {
            return res.status(403).json({ message: "You are not authorized to remove an employee" });
        }
        const companyProfile = await CompanyProfile.findOne({ userId: req.user._id });
        if (!companyProfile) {
            return res.status(404).json({ message: "Company profile not found" });
        }
        const employeeProfile = await EmployeeProfile.findOne({ email, companyMail: user.email });
        if (!employeeProfile) {
            return res.status(404).json({ message: "Employee profile not found" });
        }
        const companyProfile_1 = await CompanyProfile.findOneAndUpdate(
            { userId: req.user._id },
            { $pull: { employees: { email: email, companyMail: user.email } } },
            { new: true }
        );
        await companyProfile_1.save();
        res.status(201).json({ message: "Employee removed successfully" });
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

            //console.log("Adding case study");
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
            //console.log("Case study added successfully");
            res.status(201).json({ message: "Case study added successfully" });
        } catch (error) {
            //console.log(error);
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
        res.status(201).json({ message: "License and certification added successfully" });
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

            //Summarize the document
            console.log("Document file:", req.file);
            console.log("Document buffer:", req.file.buffer);
            console.log("Summarizing document");
            try {
                console.log("Try summarizePdf");
                const summary = await summarizePdf(req.file);
                console.log("Summary:\n", summary);
            } catch (error) {
                console.log("Error summarizing document:", error);
                try {
                    console.log("Try summarizePdfBuffer");
                    const summary = await summarizePdfBuffer(req.file.buffer);
                    console.log("Summary:\n", summary);
                } catch (error) {
                    console.log("Error summarizing document:", error);
                }
            }

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
                    },
                    $push: {
                        documentSummaries: {
                            name: name || req.file.originalname,
                            summary: summary || "No summary available",
                        }
                    }
                },
                { new: true }
            );
            await companyProfile.save();

            res.status(201).json({ message: "Document added successfully" });
        } catch (error) {
            //console.log(error);
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

exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid old password" });
        }
        if (!passwordValidator(newPassword)) {
            return res.status(400).json({ message: "Invalid new password" });
        }
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.status(201).json({ message: "Password changed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find payment by ID
        const payment = await Payment.findOne({
            user_id: id
        });
        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }


        // Fetch subscription (if available)
        let planName = "Unknown Plan";
        if (payment.subscription_id) {
            const subscription = await Subscription.findById(
                payment.subscription_id,
                { plan_name: 1 }
            );
            if (subscription) {
                planName = subscription.plan_name;
            }
        }

        // Attach company and plan to payment
        const paymentWithDetails = {
            ...payment.toObject(),
            planName
        };

        res.json(paymentWithDetails);
    } catch (err) {
        res.status(500).json({
            message: "Error fetching payment by ID",
            error: err.message
        });
    }
};