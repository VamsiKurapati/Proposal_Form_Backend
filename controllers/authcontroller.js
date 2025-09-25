const jwt = require("jsonwebtoken");
const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");
const EmployeeProfile = require("../models/EmployeeProfile");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");
const Subscription = require("../models/Subscription");
const Notification = require("../models/Notification");
const OTP = require("../models/OTP");
const nodemailer = require("nodemailer");
const { sendEmail } = require("../utils/mailSender");

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

const passwordValidator = (password) => {
  // At least 8 characters
  if (password.length < 8) return false;

  // Regular expressions
  const uppercase = /[A-Z]/;
  const lowercase = /[a-z]/;
  const digits = /[0-9]/;
  const special = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/;

  if (!uppercase.test(password)) return false;
  if (!lowercase.test(password)) return false;
  if (!digits.test(password)) return false;
  if (!special.test(password)) return false;

  return true;
};


exports.signupWithProfile = [
  multiUpload,
  async (req, res) => {
    try {
      const { email, fullName, password, phone, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: "Email already registered" });

      if (!passwordValidator(password)) return res.status(400).json({ message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ email, fullName, password: hashedPassword, mobile: phone, role });
      await user.save();

      const profileData = {
        userId: user._id,
      };

      if (role === "company") {
        profileData.email = email;
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

      const notification = new Notification({
        type: "User",
        title: "New user registered",
        description: "A new user has registered to the platform",
        created_at: new Date(),
      });
      await notification.save();

      const subject = `Welcome to RFP & Grants, ${fullName}!`;

      const body = `
        Hi ${fullName}, <br /><br />
        Your account has been successfully created. <br /><br />
        <strong>Your Login Details:</strong><br />
        &nbsp;&nbsp;&nbsp;&nbsp;Email: ${email}<br />
        &nbsp;&nbsp;&nbsp;&nbsp;Password: ${password}<br /><br />
        <a href="${process.env.FRONTEND_URL}/login">Login to Your Account</a><br /><br />
        Best regards,<br />
        The RFP & Grants Team
      `;

      await sendEmail(email, subject, body);

      res.status(201).json({ message: "Signup and profile created successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message || "Server error" });
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

    if (user.role === "SuperAdmin" || user.role === "company") {
      const subscription = await Subscription.find({ user_id: user._id }).sort({ created_at: -1 }).limit(1).lean();
      let subscriptionData = {};
      if (subscription.length === 0 || subscription[0].end_date < new Date()) {
        subscriptionData = {
          plan_name: "None",
          max_rfp_proposal_generations: 0,
          max_grant_proposal_generations: 0,
        };
      } else {
        subscriptionData = subscription[0];
      }

      const subject = "New Sign-In Alert";

      const body = `
        Hi ${user.fullName}, <br /><br />
        We noticed a sign-in to your account from a new device or location. If this was you, no action is required. Otherwise, please secure your account immediately. <br /><br />
        <a href="${process.env.FRONTEND_URL}/reset-password">Secure My Account/Change password</a><br /><br />
        Best regards,<br />
        The RFP & Grants Team
      `;

      await sendEmail(user.email, subject, body);

      return res.status(200).json({ token, user: userWithoutPassword, subscription: subscriptionData });
    } else if (user.role === "employee") {
      const employeeProfile = await EmployeeProfile.findOne({ userId: user._id });
      if (!employeeProfile) {
        return res.status(404).json({ message: "Employee profile not found" });
      }
      const data = {
        ...userWithoutPassword,
        accessLevel: employeeProfile.accessLevel,
      };

      const companyProfile = await CompanyProfile.findOne({ email: employeeProfile.companyMail });
      if (!companyProfile) {
        return res.status(404).json({ message: "Company profile not found" });
      }

      const User_1 = await User.findOne({ email: companyProfile.email });
      const subscription = await Subscription.find({ user_id: User_1._id }).sort({ created_at: -1 }).limit(1).lean();

      let subscriptionData = {};
      if (subscription.length === 0 || subscription[0].end_date < new Date()) {
        subscriptionData = {
          plan_name: "None",
          max_rfp_proposal_generations: 0,
          max_grant_proposal_generations: 0,
        };
      } else {
        subscriptionData = subscription[0];
      }

      const subject = "New Sign-In Alert";

      const body = `
        Hi ${user.fullName}, <br /><br />
        We noticed a sign-in to your account from a new device or location. If this was you, no action is required. Otherwise, please secure your account immediately. <br /><br />
        <a href="${process.env.FRONTEND_URL}/reset-password">Secure My Account/Change password</a><br /><br />
        Best regards,<br />
        The RFP & Grants Team
      `;

      await sendEmail(user.email, subject, body);

      return res.status(200).json({ token, user: data, subscription: subscriptionData });
    } else {
      return res.status(400).json({ message: "Invalid user role" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    if (!req.headers.authorization) {
      return res.status(400).json({ message: "Authorization header missing" });
    }

    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(400).json({ message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    }
    res.status(500).json({ message: err.message || "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // const otp = Math.floor(100000 + Math.random() * 900000);
    // Note: For production, use crypto.randomInt() for better security
    const otp = crypto.randomInt(100000, 999999);

    const otpData = new OTP({ email, otp });

    await otpData.save();

    // send email with otp
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return res.status(500).json({ message: "Email sending failed" });
      }
    });

    res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const otpData = await OTP.findOne({ email, otp });

    if (!otpData) {
      return res.status(404).json({ message: "Invalid OTP" });
    }

    if (otpData.expiresAt < new Date()) {
      return res.status(404).json({ message: "OTP expired" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!passwordValidator(newPassword)) {
      return res.status(400).json({ message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    await OTP.deleteOne({ email, otp });

    const subject = "Password Reset Successfully";
    const body = `
      Hi ${user.fullName}, <br /><br />
      Your password has been reset successfully. <br /><br />
      <strong>Your Login Details:</strong><br />
      &nbsp;&nbsp;&nbsp;&nbsp;Email: ${user.email}<br />
      &nbsp;&nbsp;&nbsp;&nbsp;Password: ${newPassword}<br /><br />
      Best regards,<br />
      The RFP & Grants Team
    `;
    await sendEmail(user.email, subject, body);

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};