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
        profileData.adminName = req.body.adminName;

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

    if (user.role === "company") {
      return res.status(200).json({ token, user: userWithoutPassword });
    } else if (user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: user._id });
      if (!employeeProfile) {
        return res.status(404).json({ message: "Employee profile not found" });
      }
      const data = {
        ...userWithoutPassword,
        accessLevel: employeeProfile.accessLevel,
      };
      return res.status(200).json({ token, user: data });
    } else {
      return res.status(400).json({ message: "Invalid user role" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};