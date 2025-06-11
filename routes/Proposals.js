const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

// GridFS Storage
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        const filename = buf.toString('hex') + path.extname(file.originalname);
        resolve({ filename, bucketName: 'uploads' });
      });
    });
  },
});

const upload = multer({ storage });

// Generate file URLs
const generateFileURLs = (ids) =>
  ids.map((id) => `${process.env.FRONTEND_URL || 'http://localhost:3000'}/file/${id}`);

// CREATE
router.post('/createProposal', upload.array('projects'), async (req, res) => {
  try {
    const fileIds = req.files?.map(file => file.id) || [];
    const fileNames = req.files?.map(file => file.filename) || [];

    const newProposal = new Proposal({
      ...req.body,
      projectFileIds: fileIds,
      projectFileNames: fileNames,
    });

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
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const all = await Proposal.find({ name, email }).sort({ createdAt: -1 });
    const withUrls = all.map(p => ({
      ...p.toObject(),
      projectFileUrls: generateFileURLs(p.projectFileIds || [])
    }));
    res.json(withUrls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ONE
router.get('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).send('Not found');

    const fileUrls = generateFileURLs(proposal.projectFileIds);
    res.json({ ...proposal.toObject(), projectFileUrls: fileUrls });
  } catch {
    res.status(500).send('Server error');
  }
});

// SERVE FILE
router.get('/file/:id', async (req, res) => {
  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on('error', () => res.status(404).send('File not found'));
    downloadStream.pipe(res);
  } catch {
    res.status(400).send('Invalid file ID');
  }
});

// UPDATE
router.put('/:id', upload.array('projects'), async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).send('Proposal not found');

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });

    // Delete old files
    for (const fileId of proposal.projectFileIds) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(fileId));
      } catch (err) {
        console.error('Failed to delete old file:', err.message);
      }
    }

    const fileIds = req.files.map(file => file.id);
    const fileNames = req.files.map(file => file.filename);

    const updated = await Proposal.findByIdAndUpdate(
      req.params.id,
      { ...req.body, projectFileIds: fileIds, projectFileNames: fileNames },
      { new: true }
    );

    res.json(updated);
  } catch {
    res.status(500).send('Update failed');
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).send('Proposal not found');

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });

    for (const fileId of proposal.projectFileIds) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(fileId));
      } catch (err) {
        console.error('Failed to delete file from GridFS:', err.message);
      }
    }

    await proposal.deleteOne();
    res.sendStatus(204);
  } catch {
    res.status(500).send('Delete failed');
  }
});

module.exports = router;
