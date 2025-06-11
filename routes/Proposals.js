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
        const fileId = new mongoose.Types.ObjectId(); // ✅ Valid ObjectId

        console.log('Preparing to upload file:', filename);

        resolve({
          _id: fileId, // ✅ Required by multer-gridfs-storage
          filename,
          bucketName: 'uploads',
          metadata: { originalname: file.originalname }
        });

        console.log('Created a file: ', filename);
      });
    });
  }
});

const upload = multer({ storage });

// Utility to generate file URLs (optional usage)
const generateFileURLs = (files = []) =>
  files.map((file) => `${process.env.FRONTEND_URL || 'http://localhost:3000'}/file/${file.fileId}`);

// CREATE proposal route
router.post('/createProposal', (req, res, next) => {
  upload.array('projects')(req, res, function (err) {
    if (err) {
      console.error('Multer Error:', err); // 🛑 Log if Multer failed
      return res.status(500).json({ error: 'File upload failed', details: err.message });
    }
    next(); // ✅ Proceed if no Multer error
  });
}, async (req, res) => {
  try {
    console.log("Entered /createProposal route");
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one project file is required' });
    }

    const projectFiles = files.map(file => ({
      fileId: file._id,
      filename: file.filename
    }));

    const newProposal = new Proposal({
      ...req.body,
      projectFiles
    });

    const savedProposal = await newProposal.save();
    console.log('Proposal saved:', savedProposal);
    res.status(201).json(savedProposal);
  } catch (err) {
    console.error('Error in /createProposal:', err);
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
      projectFileUrls: generateFileURLs(p.projectFiles)
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

    const fileUrls = generateFileURLs(proposal.projectFiles);
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
    for (const file of proposal.projectFiles) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(file.fileId));
      } catch (err) {
        console.error('Failed to delete old file:', err.message);
      }
    }

    const projectFiles = req.files?.map(file => ({
      fileId: file._id,
      filename: file.filename
    })) || [];

    const updated = await Proposal.findByIdAndUpdate(
      req.params.id,
      { ...req.body, projectFiles },
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

    for (const file of proposal.projectFiles) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(file.fileId));
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
