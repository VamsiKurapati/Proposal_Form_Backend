require('dotenv').config();

const multer = require("multer");
const mongoose = require("mongoose");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");

const storage = new GridFsStorage({
    url: process.env.MONGO_URI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) return reject(err);
                resolve({
                    filename: file.originalname,
                    bucketName: "template_images",
                    metadata: { originalname: file.originalname },
                });
            });
        });
    },
});

const upload = multer({ storage });

const storage2 = new GridFsStorage({
    url: process.env.MONGO_URI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) return reject(err);
                resolve({
                    filename: file.originalname,
                    bucketName: "cloud_images",
                    metadata: { originalname: file.originalname },
                });
            });
        });
    },
});

const upload2 = multer({ storage2 });

const singleTemplateImageUpload = upload.single('image');

const singleImageUpload = upload2.single('image');

exports.serveTemplateImage = async (req, res) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "template_images",
        });
        console.log(req.params.filename);
        const file = await bucket.find({ filename: req.params.filename }).toArray();
        if (!file || file.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }
        console.log(file[0]);
        const fileId = file[0]._id;
        console.log(fileId);

        // Check if file chunks are intact
        const chunksCollection = mongoose.connection.db.collection('template_images.chunks');
        const chunks = await chunksCollection.find({ files_id: fileId }).sort({ n: 1 }).toArray();

        if (chunks.length === 0) {
            console.error("No chunks found for file:", fileId);
            return res.status(500).json({ message: "File chunks are missing or corrupted" });
        }

        // Verify chunk sequence
        for (let i = 0; i < chunks.length; i++) {
            if (chunks[i].n !== i) {
                console.error(`Chunk sequence error: expected n=${i}, got n=${chunks[i].n}`);
                return res.status(500).json({ message: "File chunks are corrupted" });
            }
        }

        // Set appropriate headers for image serving
        res.set({
            'Content-Type': file[0].contentType || 'application/octet-stream',
            'Content-Length': file[0].length,
            'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
        });

        const downloadStream = bucket.openDownloadStream(fileId);

        downloadStream.on("error", (error) => {
            console.error("Download stream error:", error);
            if (!res.headersSent) {
                // If it's a chunk error, suggest cleaning up the corrupted file
                if (error.message.includes('ChunkIsMissing') || error.message.includes('ChunkIsCorrupted')) {
                    res.status(500).json({
                        message: "File is corrupted. Please re-upload the image.",
                        error: error.message,
                        suggestion: "The file chunks are corrupted. Consider deleting and re-uploading this file."
                    });
                } else {
                    res.status(500).json({ message: "Error streaming file", error: error.message });
                }
            }
        });

        downloadStream.on("end", () => {
            console.log("File stream completed successfully");
        });

        downloadStream.pipe(res);
    } catch (error) {
        console.log(error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
};

exports.uploadTemplateImage = [
    singleTemplateImageUpload,
    async (req, res) => {
        try {
            const fileId = req.file.id;
            res.status(200).json({ message: "Image uploaded successfully", fileId });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

exports.uploadImage = [
    singleImageUpload,
    async (req, res) => {
        try {
            const fileId = req.file.id;
            res.status(201).json({ message: "Image uploaded successfully", fileId });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

exports.serveImageById = async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "cloud_images",
        });

        // Check if file exists first
        const filesCollection = mongoose.connection.db.collection('cloud_images.files');
        const file = await filesCollection.findOne({ _id: fileId });

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        const downloadStream = bucket.openDownloadStream(fileId);

        downloadStream.on("error", (error) => {
            console.error("Download stream error:", error);
            if (!res.headersSent) {
                if (error.message.includes('ChunkIsMissing') || error.message.includes('ChunkIsCorrupted')) {
                    res.status(500).json({
                        message: "File is corrupted. Please re-upload the image.",
                        error: error.message
                    });
                } else {
                    res.status(500).json({ message: "Error streaming file", error: error.message });
                }
            }
        });

        downloadStream.pipe(res);
    } catch (error) {
        console.error("Error in serveImageById:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
};

exports.serveImageByFilename = async (req, res) => {
    try {
        console.log(req.params.filename);
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "cloud_images",
        });
        const file = await bucket.find({ filename: req.params.filename }).toArray();
        console.log(file);
        if (!file || file.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }
        console.log(file[0]._id);

        // Check if file chunks are intact
        const chunksCollection = mongoose.connection.db.collection('cloud_images.chunks');
        const chunks = await chunksCollection.find({ files_id: file[0]._id }).sort({ n: 1 }).toArray();

        if (chunks.length === 0) {
            console.error("No chunks found for file:", file[0]._id);
            return res.status(500).json({ message: "File chunks are missing or corrupted" });
        }

        const downloadStream = bucket.openDownloadStream(file[0]._id);

        downloadStream.on("error", (error) => {
            console.error("Download stream error:", error);
            if (!res.headersSent) {
                if (error.message.includes('ChunkIsMissing') || error.message.includes('ChunkIsCorrupted')) {
                    res.status(500).json({
                        message: "File is corrupted. Please re-upload the image.",
                        error: error.message
                    });
                } else {
                    res.status(500).json({ message: "Error streaming file", error: error.message });
                }
            }
        });

        downloadStream.pipe(res);
    } catch (error) {
        console.error("Error in serveImageByFilename:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
};

exports.deleteImage = async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "cloud_images",
        });
        await bucket.delete(fileId);
        res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.cleanupCorruptedFiles = async (req, res) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "cloud_images",
        });

        const filesCollection = mongoose.connection.db.collection('cloud_images.files');
        const chunksCollection = mongoose.connection.db.collection('cloud_images.chunks');

        const files = await filesCollection.find({}).toArray();
        const corruptedFiles = [];

        for (const file of files) {
            const chunks = await chunksCollection.find({ files_id: file._id }).sort({ n: 1 }).toArray();

            // Check if chunks are missing or corrupted
            let isCorrupted = false;
            if (chunks.length === 0) {
                isCorrupted = true;
            } else {
                for (let i = 0; i < chunks.length; i++) {
                    if (chunks[i].n !== i) {
                        isCorrupted = true;
                        break;
                    }
                }
            }

            if (isCorrupted) {
                corruptedFiles.push({
                    _id: file._id,
                    filename: file.filename,
                    uploadDate: file.uploadDate
                });
            }
        }

        res.status(200).json({
            message: "Corrupted files analysis complete",
            totalFiles: files.length,
            corruptedFiles: corruptedFiles,
            corruptedCount: corruptedFiles.length
        });
    } catch (error) {
        console.error("Error analyzing corrupted files:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCorruptedFile = async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "cloud_images",
        });

        // Delete the corrupted file
        await bucket.delete(fileId);

        res.status(200).json({ message: "Corrupted file deleted successfully" });
    } catch (error) {
        console.error("Error deleting corrupted file:", error);
        res.status(500).json({ message: error.message });
    }
};