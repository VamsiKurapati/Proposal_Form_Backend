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

// Update Company Status
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


// Get Notification Data
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
    // Fetch all support tickets
    const supportTickets = await Support.find();

    // Extract unique user IDs
    const userIds = supportTickets
      .map(ticket => ticket.userId)
      .filter(id => !!id); // ignore null/undefined

    const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];

    // Fetch company profiles in bulk
    let companiesMap = {};
    if (uniqueUserIds.length > 0) {
      const companies = await CompanyProfile.find(
        { _id: { $in: uniqueUserIds } },
        { companyName: 1, logoUrl: 1 }
      );

      companiesMap = companies.reduce((acc, company) => {
        acc[company._id.toString()] = {
          companyName: company.companyName,
          logoUrl: company.logoUrl || null,
        };
        return acc;
      }, {});
    }

    // Add companyName and logoUrl to tickets
    const supportWithCompany = supportTickets.map(ticket => {
      const companyData = ticket.userId
        ? companiesMap[ticket.userId.toString()] || { companyName: "Unknown Company", logoUrl: null }
        : { companyName: "Unknown Company", logoUrl: null };

      return {
        ...ticket.toObject(),
        companyName: companyData.companyName,
        logoUrl: companyData.logoUrl,

        status: ticket.status === "Created" && !ticket.isOpen ? "Pending" : ticket.isOpen && (ticket.status !== "In Progress" && ticket.status !== "Completed" && ticket.status !== "Withdrawn") ? "Re-Opened" : ticket.status
      };
    });

    // Initialize counters
    let BillingPayments = 0;
    let ProposalIssues = 0;
    let AccountAccess = 0;
    let TechnicalErrors = 0;
    let FeatureRequests = 0;
    let Others = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Count this month's tickets by category
    supportWithCompany.forEach(ticket => {
      const createdAt = new Date(ticket.createdAt);
      if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
        switch (ticket.category) {
          case "Billing & Payments":
            BillingPayments++;
            break;
          case "Proposal Issues":
            ProposalIssues++;
            break;
          case "Account & Access":
            AccountAccess++;
            break;
          case "Technical Errors":
            TechnicalErrors++;
            break;
          case "Feature Requests":
            FeatureRequests++;
            break;
          default:
            Others++;
        }
      }
    });

    res.json({
      TicketStats: {
        "Billing & Payments": BillingPayments,
        "Proposal Issues": ProposalIssues,
        "Account & Access": AccountAccess,
        "Technical Errors": TechnicalErrors,
        "Feature Requests": FeatureRequests,
        "Others": Others,
      },
      TicketData: supportWithCompany,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching support stats and data",
      error: err.message,
    });
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

// Add Admin Message
exports.addAdminMessage = async (req, res) => {
  try {
    const id = req.params.id;
    const { newAdminMessage } = req.body;
    const updatedSupport = await Support.findByIdAndUpdate(
      id,
      { $push: { adminMessages: { message: newAdminMessage, createdAt: new Date() } } },
      { new: true }
    );
    res.json(updatedSupport);
  } catch (err) {
    res.status(500).json({ message: "Error adding admin message", error: err.message });
  }
};

// Get Payment Summary and Payment Data
exports.getPaymentsSummaryAndData = async (req, res) => {
  try {
    // Fetch all payments
    const payments = await Payment.find();

    // Collect all unique user_ids from payments
    const userIds = payments
      .map(payment => payment.user_id)
      .filter(id => !!id);

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];

    // Fetch companies in bulk from CompanyProfile
    let companiesMap = {};
    if (uniqueUserIds.length > 0) {
      const companies = await require("../models/CompanyProfile").find(
        { _id: { $in: uniqueUserIds } },
        { companyName: 1 } // only fetch companyName field
      );

      companiesMap = companies.reduce((acc, company) => {
        acc[company._id.toString()] = company.companyName;
        return acc;
      }, {});
    }

    // Add companyName to each payment
    const paymentsWithCompanyName = payments.map(payment => {
      const companyName = payment.user_id
        ? companiesMap[payment.user_id.toString()] || "Unknown Company"
        : "Unknown Company";

      return {
        ...payment.toObject(),
        companyName
      };
    });

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
      if (payment.status === 'succeeded') {
        successfulPayments += 1;
        totalRevenue += payment.price;

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

      if (payment.status === 'failed') {
        failedPayments += 1;
      }

      if (payment.status === 'refunded') {
        totalRefunds += 1;
      }

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
      PaymentData: paymentsWithCompanyName
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching payment summary and data",
      error: err.message
    });
  }
};

// Get Subscription Plans Data
exports.getSubscriptionPlansData = async (req, res) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find();
    // Find the most popular plan by counting subscriptions per plan_id
    const planCounts = await Subscription.aggregate([
      { $group: { _id: "$plan_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    let mostPopularPlanName = null;

    if (planCounts.length > 0) {
      mostPopularPlanName = planCounts[0]._id;
    }

    // Send response with all plans and most popular plan
    res.json({
      plans: subscriptionPlans,
      mostPopularPlan: mostPopularPlanName
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching subscription plans data",
      error: err.message
    });
  }
};


// Controller to update the price of a subscription plan
exports.updateSubscriptionPlanPrice = async (req, res) => {
  try {
    const id = req.params.id;
    const { monthlyPrice, yearlyPrice, maxRFPProposalGenerations, maxGrantProposalGenerations } = req.body;

    const existingSubscriptionPlan = await SubscriptionPlan.findById(id);

    if (!existingSubscriptionPlan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    //if "enterprise" plan is being updated, then update only the price, maxRFPProposalGenerations, maxGrantProposalGenerations
    if (existingSubscriptionPlan.name === "Enterprise") {
      const updatedSubscriptionPlan = await SubscriptionPlan.findByIdAndUpdate(id, { monthlyPrice, yearlyPrice, maxRFPProposalGenerations, maxGrantProposalGenerations }, { new: true });
      res.json(updatedSubscriptionPlan);
    }

    //if "basic" or "pro" plan is being updated, then update only the price, maxEditors, maxViewers, maxRFPProposalGenerations, maxGrantProposalGenerations

    const { maxEditors, maxViewers } = req.body;
    if (existingSubscriptionPlan.name === "Basic" || existingSubscriptionPlan.name === "Pro") {
      const updatedSubscriptionPlan = await SubscriptionPlan.findByIdAndUpdate(id, { monthlyPrice, yearlyPrice, maxEditors, maxViewers, maxRFPProposalGenerations, maxGrantProposalGenerations }, { new: true });
      res.json(updatedSubscriptionPlan);
    }
  } catch (err) {
    res.status(500).json({ message: "Error updating subscription plan", error: err.message });
  }
};

// Priority Cron Job
exports.priorityCronJob = async (req, res) => {
  try {
    //Get all support tickets and update the priority of the ticket to "Medium" if ticket.createdAt is more than 1 day and "High" if ticket.createdAt is more than 48 hours
    const supportTickets = await Support.find();
    supportTickets.forEach(ticket => {
      const createdAt = new Date(ticket.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - createdAt);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        ticket.priority = "Medium";
      } else if (diffDays > 2) {
        ticket.priority = "High";
      }
    });
    res.json({ message: "Priority updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating priority", error: err.message });
  }
};