const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
require('dotenv').config();

router.get('/getUsersData', async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // Step 1: Fetch all proposals
    const proposals = await Proposal.find({}).lean();

    // Step 2: Gather all unique fileIds from proposals
    const allFileIds = proposals
      .flatMap(proposal => proposal.uploadedDocuments?.map(doc => doc.fileId) || [])
      .filter(Boolean);

    // Step 3: Fetch file metadata from GridFS
    const files = await db.collection('uploads.files')
      .find({ _id: { $in: allFileIds } })
      .toArray();

    // Step 4: Fetch file chunks and convert to base64
    const filesWithBase64 = await Promise.all(
      files.map(async (file) => {
        const chunks = await db.collection('uploads.chunks')
          .find({ files_id: file._id })
          .sort({ n: 1 })
          .toArray();

        const fileBuffer = Buffer.concat(chunks.map(chunk => chunk.data.buffer));
        return {
          ...file,
          base64: fileBuffer.toString('base64'),
        };
      })
    );

    // Step 5: Map fileId to its full metadata + base64
    const filesMap = filesWithBase64.reduce((acc, file) => {
      acc[file._id.toString()] = file;
      return acc;
    }, {});

    // Step 6: Attach enriched fileInfo to each uploadedDocument
    const enrichedProposals = proposals.map(proposal => {
      const enrichedDocs = (proposal.uploadedDocuments || []).map(doc => ({
        ...doc,
        fileInfo: filesMap[doc.fileId.toString()] || null,
      }));

      return {
        ...proposal,
        uploadedDocuments: enrichedDocs,
      };
    });

    // Step 7: Send full enriched data
    res.status(200).json(enrichedProposals);
  } catch (err) {
    console.error('Error in /getUsersData:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

module.exports = router;
