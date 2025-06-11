// routes/proposals.js
const express = require('express');
const router = express.Router();
const Proposal = require('../models/Proposal.js');

// CREATE
router.post('/createProposal', async (req, res) => {
  try {
    const newProposal = new Proposal(req.body);
    const saved = await newProposal.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ALL
router.post('/', async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: "Name and email are required" });
        }
        // Find all proposals by name and email, sorted by createdAt in descending order
        const all = await Proposal.find( {name: name, email: email} ).sort({ createdAt: -1 });
        res.json(all);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ ONE
router.get('/:id', async (req, res) => {
  try {
    const one = await Proposal.findById(req.params.id);
    if (!one) return res.status(404).send("Not found");
    res.json(one);
  } catch {
    res.status(500).send("Server error");
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const updated = await Proposal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch {
    res.status(500).send("Update failed");
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await Proposal.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch {
    res.status(500).send("Delete failed");
  }
});

module.exports = router;
