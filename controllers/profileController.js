require('dotenv').config();

const mongoose = require("mongoose");
const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const EmployeeProfile = require("../models/EmployeeProfile");
const SubmittedProposals = require("../models/SubmittedProposals");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");
const multer = require("multer");

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
        };
        const Proposals = await SubmittedProposals.find({ companyId: req.user._id });
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
                { companyName, industry, location, linkedIn, website, services: parsedServices, establishedYear, numberOfEmployees, bio },
                { new: true }
            );
            res.status(200).json({ message: "Company profile updated successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

exports.addEmployee = async (req, res) => {
    try {
        const { name, email, phone, linkedIn, about, jobTitle, accessLevel } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "company") {
            return res.status(403).json({ message: "You are not authorized to add an employee" });
        }

        const user_1 = await User.findOne({ email });
        if (!user_1) {
            console.log("User not found");
            const password = crypto.randomBytes(16).toString("hex");
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.create({ fullName: name, email, mobile: phone, password: hashedPassword, role: "employee" });
            console.log("User created");
            const employeeProfile = new EmployeeProfile({ userId: user_1._id, name, email, phone, linkedIn, about, jobTitle, accessLevel });
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
                employeeProfile.linkedIn = linkedIn;
                employeeProfile.about = about;
                employeeProfile.jobTitle = jobTitle;
                employeeProfile.accessLevel = accessLevel;
                await employeeProfile.save();
                console.log("Employee profile updated");
            } else {
                console.log("Employee profile not found");
                const employeeProfile = new EmployeeProfile({ userId: user_1._id, name, email, phone, linkedIn, about, jobTitle, accessLevel });
                await employeeProfile.save();
                console.log("Employee profile created");
            }
        }

        const employeeProfile = await EmployeeProfile.findOne({ userId: user_1._id });
        const companyProfile = await CompanyProfile.findOneAndUpdate(
            { userId: req.user._id },
            {
                $push: {
                    employees: {
                        employeeProfile: employeeProfile._id,
                        name: employeeProfile.name,
                        email: employeeProfile.email,
                        phone: employeeProfile.phone,
                        linkedIn: employeeProfile.linkedIn,
                        about: employeeProfile.about,
                        jobTitle: employeeProfile.jobTitle,
                        accessLevel: employeeProfile.accessLevel
                    }
                }
            },
            { new: true }
        );
        res.status(200).json({ message: "Employee added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addCaseStudy = async (req, res) => {
    try {
        const { title, company, image, link, readTime } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "company") {
            return res.status(403).json({ message: "You are not authorized to add a case study" });
        }
        const companyProfile = await CompanyProfile.findOneAndUpdate(
            { userId: req.user._id },
            { $push: { caseStudies: { title, company, image, link, readTime } } },
            { new: true }
        );

        res.status(200).json({ message: "Case study added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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