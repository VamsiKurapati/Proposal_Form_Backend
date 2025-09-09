const Proposal = require("../models/Proposal");
const CompanyProfile = require("../models/CompanyProfile");
const Notification = require("../models/Notification");
const Support = require("../models/Support");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Payment = require("../models/Payments");
const Subscription = require("../models/Subscription");
const nodemailer = require('nodemailer');
const User = require("../models/User");
const CustomPlan = require("../models/CustomPlan");
const PaymentDetails = require("../models/PaymentDetails");
const Contact = require("../models/Contact");


// Merged Company Stats and Company Data API
exports.getCompanyStatsAndData = async (req, res) => {
  try {
    const totalCompanies = await CompanyProfile.countDocuments();
    const totalProposals = await Proposal.countDocuments();
    const activeUsers = await User.countDocuments({ subscription_status: "active" });
    const inactiveUsers = await User.countDocuments({ subscription_status: "inactive" });

    const companies = await CompanyProfile.find();
    // For each company, find the user's current subscription and attach plan_name
    const userIds = companies.map(company => company.userId);
    // Fetch all subscriptions for these users
    const subscriptions = await Subscription.find({ user_id: { $in: userIds } });
    // Map user_id to plan_name for quick lookup (get latest subscription per user)
    const userPlanMap = {};
    subscriptions.forEach(sub => {
      const key = sub.user_id ? sub.user_id.toString() : undefined;
      if (!key) return;
      // If multiple subscriptions, pick the latest by end_date
      if (!userPlanMap[key] || (userPlanMap[key].end_date < sub.end_date)) {
        userPlanMap[key] = {
          plan_name: sub.plan_name,
          end_date: sub.end_date
        };
      }
    });
    // Attach plan_name to each company
    companies.forEach(company => {
      const key = company.userId ? company.userId.toString() : undefined;
      const planInfo = key ? userPlanMap[key] : null;
      company._doc.plan_name = planInfo ? planInfo.plan_name : null;
    });

    res.json({
      stats: {
        "Total Proposals": totalProposals,
        "Total Users": totalCompanies,
        "Active Users": activeUsers,
        "Inactive Users": inactiveUsers
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
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Error fetching notification data", error: err.message });
  }
};


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

    // Fetch companies in bulk from CompanyProfile by userId
    let companiesMap = {};
    if (uniqueUserIds.length > 0) {
      const companies = await require("../models/CompanyProfile").find(
        { userId: { $in: uniqueUserIds } },
        { companyName: 1, userId: 1 }
      );

      companiesMap = companies.reduce((acc, company) => {
        if (company.userId) {
          acc[company.userId.toString()] = company.companyName;
        }
        return acc;
      }, {});
    }

    // For each payment, fetch the plan_name from the related Subscription and attach it
    // Collect all unique subscription_ids from payments
    const subscriptionIds = payments
      .map(payment => payment.subscription_id)
      .filter(id => !!id);

    // Remove duplicates
    const uniqueSubscriptionIds = [...new Set(subscriptionIds.map(id => id.toString()))];

    // Fetch subscriptions in bulk
    let subscriptionMap = {};
    if (uniqueSubscriptionIds.length > 0) {
      const subscriptions = await Subscription.find(
        { _id: { $in: uniqueSubscriptionIds } },
        { plan_name: 1 }
      );
      subscriptionMap = subscriptions.reduce((acc, sub) => {
        acc[sub._id.toString()] = sub.plan_name;
        return acc;
      }, {});
    }

    // Add companyName to each payment
    const paymentsWithCompanyName = payments.map(payment => {
      const companyName = payment.user_id
        ? companiesMap[payment.user_id.toString()] || "Unknown Company"
        : "Unknown Company";

      const planName = payment.subscription_id
        ? subscriptionMap[payment.subscription_id.toString()] || "Unknown Plan"
        : "Unknown Plan";

      return {
        ...payment.toObject(),
        companyName,
        planName
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

// Controller to update the isContact of a subscription plan
exports.updateSubscriptionPlanIsContact = async (req, res) => {
  try {
    const id = req.params.id;
    const { isContact } = req.body;
    const updatedSubscriptionPlan = await SubscriptionPlan.findByIdAndUpdate(id, { isContact }, { new: true });
    res.json(updatedSubscriptionPlan);
  } catch (err) {
    res.status(500).json({ message: "Error updating subscription plan isContact", error: err.message });
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




// Custom Plan
exports.sendEmail = async (req, res) => {
  const { email, price, planType, maxEditors, maxViewers, maxRFPProposalGenerations, maxGrantProposalGenerations } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const customPlan = new CustomPlan({ userId: user._id, email, price, planType, maxEditors, maxViewers, maxRFPProposalGenerations, maxGrantProposalGenerations });
  await customPlan.save();

  let AdminPaymenyData = {};
  const paymentDetails = await PaymentDetails.find();
  if (!paymentDetails) {
    AdminPaymenyData = {
      upi_id: null,
      account_holder_name: null,
      account_number: null,
      ifsc_code: null,
      bank_name: null,
      branch_name: null,
      bank_address: null,
      is_primary: false,
    };
  }
  else {
    AdminPaymenyData = paymentDetails[0];
  }
  // console.log(AdminPaymenyData);

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
    subject: `RFP2GRANTS - Enterprise Subscription Plan Request`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
        <h2 style="color: #2563EB;">RFP2GRANTS - Enterprise Subscription Plan Request</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Price:</strong> ${price || "Not provided"}</p>
        <p><strong>Plan Type:</strong> ${planType || "Not provided"}</p>   
        <p><strong>Max Editors:</strong> ${maxEditors || "Not specified"}</p>
        <p><strong>Max Viewers:</strong> ${maxViewers || "Not specified"}</p>
        <p><strong>Max RFP Proposal Generations:</strong> ${maxRFPProposalGenerations || "Not specified"}</p>
        <p><strong>Max Grant Proposal Generations:</strong> ${maxGrantProposalGenerations || "Not specified"}</p>
        <hr />

        <h2 style="color: #2563EB;">Payment Details:</h2>
        <p><strong>UPI ID:</strong> ${AdminPaymenyData.upi_id || "Not provided"}</p>
        <p><strong>    (OR)</strong></p>
        <p><strong>Account Holder Name:</strong> ${AdminPaymenyData.account_holder_name || "Not provided"}</p>
        <p><strong>Account Number:</strong> ${AdminPaymenyData.account_number || "Not provided"}</p>
        <p><strong>IFSC Code:</strong> ${AdminPaymenyData.ifsc_code || "Not provided"}</p>
        <p><strong>Bank Name:</strong> ${AdminPaymenyData.bank_name || "Not provided"}</p>
        <p><strong>Branch Name:</strong> ${AdminPaymenyData.branch_name || "Not provided"}</p>
        <p style="font-size: 12px; color: #666;">This email was generated from the Enterprise Plan Request.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Failed to send email." });
  }
};



// Get Custom Plan Data
exports.getCustomPlanData = async (req, res) => {
  const customPlans = await CustomPlan.find();

  // For each custom plan, fetch the corresponding companyName from CompanyProfile using the email
  const customPlansWithCompanyName = await Promise.all(
    customPlans.map(async (plan) => {
      const companyProfile = await CompanyProfile.findOne({ email: plan.email });
      return {
        ...plan.toObject(),
        companyName: companyProfile ? companyProfile.companyName : null,
      };
    })
  );
  res.json(customPlansWithCompanyName);
};

exports.editCustomPlan = async (req, res) => {
  const { id } = req.params;

  const { price, planType, maxEditors, maxViewers, maxRFPProposalGenerations, maxGrantProposalGenerations } = req.body;

  const customPlan = await CustomPlan.findByIdAndUpdate(id, { price, planType, maxEditors, maxViewers, maxRFPProposalGenerations, maxGrantProposalGenerations }, { new: true });

  let AdminPaymenyData = {};

  const paymentDetails = await PaymentDetails.find();

  if (!paymentDetails) {
    AdminPaymenyData = {
      upi_id: null,
      account_holder_name: null,
      account_number: null,
      ifsc_code: null,
      bank_name: null,
      branch_name: null,
      bank_address: null,
      is_primary: false,
    };
  }
  else {
    AdminPaymenyData = paymentDetails[0];
  }
  // console.log(AdminPaymenyData);

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
    to: customPlan.email,
    subject: `RFP2GRANTS - Enterprise Subscription Plan Request`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
        <h2 style="color: #2563EB;">RFP2GRANTS - Enterprise Subscription Plan Request</h2>
        <p><strong>Email:</strong> ${customPlan.email}</p>
        <p><strong>Price:</strong> ${price || "Not provided"}</p>
        <p><strong>Plan Type:</strong> ${planType || "Not provided"}</p>   
        <p><strong>Max Editors:</strong> ${maxEditors || "Not specified"}</p>
        <p><strong>Max Viewers:</strong> ${maxViewers || "Not specified"}</p>
        <p><strong>Max RFP Proposal Generations:</strong> ${maxRFPProposalGenerations || "Not specified"}</p>
        <p><strong>Max Grant Proposal Generations:</strong> ${maxGrantProposalGenerations || "Not specified"}</p>
        <hr />

        <h2 style="color: #2563EB;">Payment Details:</h2>
        <p><strong>UPI ID:</strong> ${AdminPaymenyData.upi_id || "Not provided"}</p>
        <p><strong>    (OR)</strong></p>
        <p><strong>Account Holder Name:</strong> ${AdminPaymenyData.account_holder_name || "Not provided"}</p>
        <p><strong>Account Number:</strong> ${AdminPaymenyData.account_number || "Not provided"}</p>
        <p><strong>IFSC Code:</strong> ${AdminPaymenyData.ifsc_code || "Not provided"}</p>
        <p><strong>Bank Name:</strong> ${AdminPaymenyData.bank_name || "Not provided"}</p>
        <p><strong>Branch Name:</strong> ${AdminPaymenyData.branch_name || "Not provided"}</p>
        <p style="font-size: 12px; color: #666;">This email was generated from the Enterprise Plan Request.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error in editCustomPlan:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCustomPlan = async (req, res) => {
  const { id } = req.params;
  await CustomPlan.findByIdAndDelete(id);
  res.status(200).json({ message: "Custom plan deleted successfully" });
};



exports.createCustomPlan = async (req, res) => {
  try {
    const {
      email,
      price,
      planType,
      maxEditors,
      maxViewers,
      maxRFPProposalGenerations,
      maxGrantProposalGenerations,
      transaction_id,
      companyName,
      payment_method,
    } = req.body;

    console.log(req.body);

    // Find and delete any existing CustomPlan with the same email before creating a new one
    await CustomPlan.deleteMany({ email });

    // 1. Validate user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found for the given email" });
    }

    // 2. Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (planType === "monthly") {
      endDate.setMonth(startDate.getMonth() + 1);
    } else if (planType === "yearly") {
      endDate.setFullYear(startDate.getFullYear() + 1);
    }

    // 3. Create Subscription record
    const subscription = await Subscription.create({
      user_id: user._id,
      plan_name: "Enterprise",
      plan_price: price,
      start_date: startDate,
      end_date: endDate,
      renewal_date: planType === "monthly" ? endDate : null,
      max_editors: maxEditors,
      max_viewers: maxViewers,
      max_rfp_proposal_generations: maxRFPProposalGenerations,
      max_grant_proposal_generations: maxGrantProposalGenerations,
      auto_renewal: true,
    });

    // 4. Create Payment record
    const payment = await Payment.create({
      user_id: user._id,
      subscription_id: subscription._id,
      price: price,
      status: "Success",
      paid_at: new Date(),
      transaction_id: transaction_id || null,
      companyName: companyName || null,
      payment_method: payment_method || "Manual Entry",
    });

    // 5. Return success response
    res.status(201).json({
      message: "Custom subscription and payment created successfully",
      subscription,
      payment,
    });
  } catch (error) {
    console.error("Error creating custom plan:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// payment details
exports.getPaymentDetails = async (req, res) => {
  const paymentDetails = await PaymentDetails.find();
  res.json(paymentDetails);
};

exports.editPaymentDetails = async (req, res) => {
  const { id } = req.params;
  const { upi_id, account_holder_name, account_number, ifsc_code, bank_name, branch_name, bank_address, is_primary } = req.body;
  const paymentDetails = await PaymentDetails.findByIdAndUpdate(id, { upi_id, account_holder_name, account_number, ifsc_code, bank_name, branch_name, bank_address, is_primary }, { new: true });
  res.json(paymentDetails);
};



//contact 
exports.getContactData = async (req, res) => {
  // Only return contacts from the past 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const contactData = await Contact.find({ createdAt: { $gte: thirtyDaysAgo } });
  res.json(contactData);
};

exports.deleteContactData = async (req, res) => {
  const { id } = req.params;
  await Contact.findByIdAndDelete(id);
  res.status(200).json({ message: "Contact data deleted successfully" });
};

exports.updateContactData = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  await Contact.findByIdAndUpdate(id, { status }, { new: true });
  res.status(200).json({ message: "Contact data updated successfully" });
};
