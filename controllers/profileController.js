const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const EmployeeProfile = require("../models/EmployeeProfile");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");


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


exports.updateCompanyProfile = async (req, res) => {
    try {
        const { companyName, industry, location, website, services, establishedYear, departments, teamSize, numberOfEmployees, bio } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "company") {
            return res.status(403).json({ message: "You are not authorized to update this profile" });
        }
        user.email = req.body.email;
        user.phone = req.body.phone;
        await user.save();

        const companyProfile = await CompanyProfile.findOneAndUpdate(
            { userId: req.user._id },
            { companyName, industry, location, website, services, establishedYear, departments, teamSize, numberOfEmployees, bio },
            { new: true }
        );
        res.status(200).json({ message: "Company profile updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addEmployee = async (req, res) => {
    try {
        const { name, email, phone, linkedIn, about, jobTitle, department, team, accessLevel } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== "company") {
            return res.status(403).json({ message: "You are not authorized to add an employee" });
        }

        const searchEmployee = await EmployeeProfile.findOne({ email });
        if (searchEmployee) {
            return res.status(400).json({ message: "Employee already exists" });
        }

        const employeeProfile = new EmployeeProfile({ name, email, phone, linkedIn, about, jobTitle, department, team, accessLevel });
        await employeeProfile.save();

        const companyProfile = await CompanyProfile.findOneAndUpdate(
            { userId: req.user._id },
            { $push: { employees: employeeProfile } },
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
        const caseStudy = new CompanyProfile({ title, company, image, link, readTime });
        await caseStudy.save();
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
        const licenseAndCertification = new CompanyProfile({ name, issuer, validTill });
        await licenseAndCertification.save();
        res.status(200).json({ message: "License and certification added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addDocument = async (req, res) => {
    try {
        const { name, type, size, url } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const document = new CompanyProfile({ name, type, size, url });
        await document.save();
        res.status(200).json({ message: "Document added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addProposal = async (req, res) => {
    try {
        const { title, company, amount, status } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const proposal = new CompanyProfile({ title, company, amount, status });
        await proposal.save();
        res.status(200).json({ message: "Proposal added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addRecentActivity = async (req, res) => {
    try {
        const { title, description } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const recentActivity = new CompanyProfile({ title, description });
        await recentActivity.save();
        res.status(200).json({ message: "Recent activity added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addDeadline = async (req, res) => {
    try {
        const { title, status, dueDate } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const deadline = new CompanyProfile({ title, status, dueDate });
        await deadline.save();
        res.status(200).json({ message: "Deadline added successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};