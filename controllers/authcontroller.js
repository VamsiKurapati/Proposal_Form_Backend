const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");

exports.signup = async (req, res) => {
  const { fullName, email, password, mobile, organization } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      mobile,
      organization
    });

    await user.save();
    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
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

exports.signupWithProfile = [
  multiUpload,
  async (req, res) => {
    try {
      const { email, fullName, password, phone, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: "Email already registered" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ email, fullName, password: hashedPassword, mobile: phone, role });
      await user.save();

      const profileData = {
        userId: user._id,
      };

      if (role === "company") {
        profileData.companyEmail = email;
        profileData.companyName = req.body.companyName;
        profileData.industry = req.body.industry;
        profileData.location = req.body.location;
        profileData.numberOfEmployees = req.body.numberOfEmployees;
        profileData.website = req.body.website;
        profileData.bio = req.body.bio;
        profileData.establishedYear = req.body.establishedYear;
        profileData.linkedIn = req.body.linkedIn;

        const companyProfile = new CompanyProfile(profileData);
        await companyProfile.save();
      }

      res.status(201).json({ message: "Signup and profile created successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
];

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const { password: _, ...userWithoutPassword } = user; // excluded password

    const token = jwt.sign(
      { user: userWithoutPassword },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};