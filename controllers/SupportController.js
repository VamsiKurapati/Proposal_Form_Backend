const Support = require('../models/Support');
const mongoose = require('mongoose');

// Create ticket API
exports.createTicket = async (req, res) => {
  try {
    const { userId, category, subCategory, description } = req.body;

    if (!userId || !description) {
      return res.status(400).json({ message: "userId and description are required" });
    }

    const attachments = [];

    if (req.files && req.files.length > 0) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads',
      });

      for (const file of req.files) {
        const uploadStream = bucket.openUploadStream(file.originalname, {
          metadata: { originalname: file.originalname }
        });

        uploadStream.end(file.buffer);

        attachments.push({
          fileName: file.originalname,
          fileUrl: uploadStream.id.toString(),
          uploadedAt: new Date()
        });
      }
    }

    const ticket = new Support({
      userId: new mongoose.Types.ObjectId(userId),
      category,
      subCategory,
      description,
      attachments
    });

    const savedTicket = await ticket.save();
    res.status(201).json({ message: "Ticket created successfully", ticket: savedTicket });
  } catch (err) {
    res.status(500).json({ message: "Error creating ticket", error: err.message });
  }
};

// Get tickets for a specific user API
exports.getUserTickets = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Direct match since userId is stored as string
    const tickets = await Support.find({ userId })
      .sort({ createdAt: -1 });

    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ message: "Error fetching tickets", error: err.message });
  }
};

// Controller to update the status of a support ticket (e.g., from 'Completed' to 'Re-Opened')
exports.reopenSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the ticket by ID
    const ticket = await Support.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    // Only allow reopening if the current status is 'Completed'
    // if (ticket.status !== 'Completed' || ticket.status !== 'Withdrawn') {
    //   return res.status(400).json({ message: "Only completed tickets can be re-opened" });
    // }

    ticket.status = 'Created';
    ticket.isOpen = true;
    await ticket.save();

    res.json({ message: "Ticket status updated to Re-Opened", ticket });
  } catch (err) {
    res.status(500).json({ message: "Error updating ticket status", error: err.message });
  }
};

exports.withdrawnSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the ticket by ID
    const ticket = await Support.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    // Only allow reopening if the current status is 'Completed'
    // if (ticket.status !== 'Completed') {
    //   return res.status(400).json({ message: "Only completed tickets can be re-opened" });
    // }

    ticket.status = 'Withdrawn';
    // ticket.isOpen = true;
    await ticket.save();

    res.json({ message: "Ticket status updated to Re-Opened", ticket });
  } catch (err) {
    res.status(500).json({ message: "Error updating ticket status", error: err.message });
  }
};



