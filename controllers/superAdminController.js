const Proposal = require("../models/Proposal");
const CompanyProfile = require("../models/CompanyProfile");
const Notification = require("../models/Notification");
const Support = require("../models/Support");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Payment = require("../models/Payments");
const Subscription = require("../models/Subscription");


// Merged Company Stats and Company Data API
exports.getCompanyStatsAndData = async (req, res) => {
  try {
    const totalCompanies = await CompanyProfile.countDocuments();
    const totalProposals = await Proposal.countDocuments();
    const companies = await CompanyProfile.find();

    res.json({
      stats: {
        "Total Proposals": totalProposals,
        "Total Users": totalCompanies,
        "Active Users": 0,
        "Inactive Users": 0
      },
      CompanyData: companies
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching company stats and data", error: err.message });
  }
};

exports.updateCompanyStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const blocked = req.body.blocked === "Blocked" ? true : false;
    const updatedCompany = await CompanyProfile.findByIdAndUpdate(
      id,
      { $set: { blocked } },
      { new: true, runValidators: true }
    );
    res.json(updatedCompany);
  } catch (err) {
    res.status(500).json({ message: "Error updating company status", error: err.message });
  }
};

// POST request to create a new notification
exports.createNotification = async (req, res) => {
  try {
    const { title, description, type } = req.body;

    // Basic validation
    if (!title || !description || !type) {
      return res.status(400).json({ message: "Title, description, and type are required" });
    }

    const notification = new Notification({
      title,
      description,
      type
    });

    await notification.save();

    res.status(201).json({ message: "Notification created successfully", notification });
  } catch (err) {
    res.status(500).json({ message: "Error creating notification", error: err.message });
  }
};



exports.getNotificationData = async (req, res) => {
  try {
    const notifications = await Notification.find();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Error fetching notification data", error: err.message });
  }
}


// Controller to get support ticket type counts and all support tickets in one API call
exports.getSupportStatsAndData = async (req, res) => {
  try {
    // Get counts by category (case-sensitive to match schema)
    const counts = await Support.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);

    // Categories as per Support.js schema
    const categoryCounts = {
      "Billing & Payments": 0,
      "Proposal Issues": 0,
      "Account & Access": 0,
      "Technical Errors": 0,
      "Feature Requests": 0,
      "Others": 0
    };

    counts.forEach(item => {
      // Normalize category key to match the schema's enum (case-sensitive)

      if (categoryCounts.hasOwnProperty(item._id)) {
        categoryCounts[item._id] = item.count;
      }
    });

    // Get all support tickets, sorted by creation date descending

    const supports = await Support.find().sort({ createdAt: -1 }).lean();

    const support_data = supports.map(item => {
      // console.log(item.subCategory, item.status);
      return {
        ...item,
        status: item.isOpen && (item.status !== "In Progress" && item.status !== "Completed" && item.status !== "Withdrawn") ? "Re-Opened" : item.status
      }
    });

    res.json({
      TicketStats: categoryCounts,
      TicketData: support_data
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching support stats and data", error: err.message });
  }
};

// Controller to update (edit) a support ticket according to Support.js schema
exports.updateSupportTicket = async (req, res) => {
  try {

    const { id } = req.params;
    // Accept all updatable fields as per Support.js schema
    const { status } = req.body;

    const { Resolved_Description } = req.body || "";

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const updatedSupport = await Support.findByIdAndUpdate(
      id,
      { $set: { status, Resolved_Description } },
      { new: true }
    );

    if (!updatedSupport) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    res.json(updatedSupport);
  } catch (err) {
    res.status(500).json({ message: "Error updating support ticket", error: err.message });
  }
};

exports.addAdminMessage = async (req, res) => {
  try {
    const id = req.params.id;
    const { message } = req.body;
    const updatedSupport = await Support.findByIdAndUpdate(
      id,
      { $push: { adminMessages: { message } } },
      { new: true }
    );
    res.json(updatedSupport);
  } catch (err) {
    res.status(500).json({ message: "Error adding admin message", error: err.message });
  }
};



//Subscription Plans
exports.createSubscriptionPlan = async (req, res) => {
  try {
    const { name, description, price, billing_cycle, features } = req.body;
  } catch (err) {
    res.status(500).json({ message: "Error creating subscription plan", error: err.message });
  }
};

exports.getSubscriptionPlans = async (req, res) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find();
    res.json(subscriptionPlans);
  } catch (err) {
    res.status(500).json({ message: "Error fetching subscription plans", error: err.message });
  }
};

exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, price, billing_cycle, features } = req.body;
  } catch (err) {
    res.status(500).json({ message: "Error updating subscription plan", error: err.message });
  }
};


// Merged Payment Summary and Payment Data API
exports.getPaymentsSummaryAndData = async (req, res) => {
  try {
    // Fetch all payments
    const payments = await Payment.find();

    // Initialize stats
    let totalRevenue = 0;
    let successfulPayments = 0;
    let failedPayments = 0;
    let revenueThisMonth = 0;
    let totalRefunds = 0;
    let pendingRefunds = 0;
    let activeUsers = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    payments.forEach(payment => {
      // Successful payments
      if (payment.status === 'succeeded') {
        successfulPayments += 1;
        totalRevenue += payment.price;

        // Revenue this month
        if (payment.paid_at) {
          const paidAt = new Date(payment.paid_at);
          if (
            paidAt.getMonth() === currentMonth &&
            paidAt.getFullYear() === currentYear
          ) {
            revenueThisMonth += payment.price;
          }
        }
      }

      // Failed payments
      if (payment.status === 'failed') {
        failedPayments += 1;
      }

      // Refunded payments
      if (payment.status === 'refunded') {
        totalRefunds += 1;
      }

      // Pending refunds
      if (
        payment.status === 'pending refund' ||
        payment.status === 'pending_refund' ||
        payment.status === 'pending refund, refunded'
      ) {
        pendingRefunds += 1;
      }
    });

    res.json({
      PaymentStats: {
        "Total Revenue": totalRevenue,
        "Successful Payments": successfulPayments,
        "Failed Payments": failedPayments,
        "Active Subscriptions": activeUsers,
        "Total Refunds": totalRefunds,
        "Pending Refunds": pendingRefunds,
        "Revenue This Month": revenueThisMonth
      },
      PaymentData: payments
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching payment summary and data", error: err.message });
  }
};

//subscription
exports.getSubscriptionData = async (req, res) => {
  try {
    const subscriptionData = await Subscription.find();
    res.json(subscriptionData);
  } catch (err) {
    res.status(500).json({ message: "Error fetching subscription data", error: err.message });
  }
};