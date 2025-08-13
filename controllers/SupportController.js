const Support = require('../models/Support');
const mongoose = require('mongoose');

exports.createTicket = async (req, res) => {
  try {
    const { userId, type, subCategory, description} = req.body;

    if (!userId || !type || !description) {
      return res.status(400).json({ message: "userId, type, and description are required" });
    }

    const ticketId = `TICKET-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const attachments = (req.files || []).map(file => ({
      fileName: file.originalname,
      fileUrl: file.path || file.location || file.filename,
      uploadedAt: new Date()
    }));

    const ticket = new Support({
      ticketId,
      userId: new mongoose.Types.ObjectId(userId),
      type,
      subCategory: subCategory || null,
      description,
      status: 'Created',
      attachments
    });

    await ticket.save();

    res.status(201).json({ message: "Support ticket created successfully", ticket });
  } catch (err) {
    res.status(500).json({ message: "Error creating support ticket", error: err.message });
  }
};

// 2. Display all the tickets of that user
exports.getUserTickets = async (req, res) => {
  try {
    const { userId } = req.params;
    const tickets = await Support.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ message: "Error fetching user tickets", error: err.message });
  }
};

// 3. Display all the tickets of that user using query parameter
exports.getUserTicketsByQuery = async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }
    
    const tickets = await Support.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ message: "Error fetching user tickets", error: err.message });
  }
};

