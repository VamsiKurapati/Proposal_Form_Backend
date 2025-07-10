require('dotenv').config();

const mongoose = require("mongoose");
const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const EmployeeProfile = require("../models/EmployeeProfile");

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