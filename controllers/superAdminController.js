const Proposal = require("../models/Proposal");
const CompanyProfile = require("../models/CompanyProfile");
const Notification = require("../models/Notification");
const Support = require("../models/Support");

exports.getStats = async (req, res) => {
  try {
    const totalProposals = await Proposal.countDocuments();
    const totalCompanies = await CompanyProfile.countDocuments();

    res.json({
      totalProposals,
      totalCompanies
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching stats", error: err.message });
  }
};

exports.getCompanyData = async (req, res) => {
  try {
    const companies = await CompanyProfile.find();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: "Error fetching company data", error: err.message });
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



// Controller to get count of each support ticket type
exports.getSupportTypeCounts = async (req, res) => {
  try {
    const counts = await Support.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]);
    // Format as { type: count }
    const result = {};
    counts.forEach(item => {
      result[item._id] = item.count;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Error fetching support type counts", error: err.message });
  }
};

// Controller to get all support tickets data
exports.getAllSupportTickets = async (req, res) => {
  try {
    const supports = await Support.find();
    res.json(supports);
  } catch (err) {
    res.status(500).json({ message: "Error fetching all support tickets", error: err.message });
  }
};

// Controller to update (edit) a support ticket
exports.updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    // Only allow updating certain fields
    const allowedUpdates = ['subject', 'desc', 'status', 'priority', 'type'];
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedSupport = await Support.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedSupport) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    res.json(updatedSupport);
  } catch (err) {
    res.status(500).json({ message: "Error updating support ticket", error: err.message });
  }
};




