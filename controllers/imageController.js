require('dotenv').config();

const multer = require("multer");
const mongoose = require("mongoose");
const { GridFsStorage } = require("multer-gridfs-storage");
const crypto = require("crypto");
const path = require("path");

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

const singleLogoUpload = upload.single('image');

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
                res.status(500).json({ message: "Error streaming file", error: error.message });
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
    singleLogoUpload,
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
    singleLogoUpload,
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
            bucketName: "uploads",
        });
        const downloadStream = bucket.openDownloadStream(fileId);
        downloadStream.on("error", () => res.status(404).send("File not found"));
        downloadStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.serveImageByFilename = async (req, res) => {
    try {
        console.log(req.params.filename);
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "uploads",
        });
        const file = await bucket.find({ filename: req.params.filename }).toArray();
        console.log(file);
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }
        console.log(file[0]._id);
        const downloadStream = bucket.openDownloadStream(file[0]._id);
        downloadStream.on("error", () => res.status(404).send("File not found"));
        downloadStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteImage = async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "uploads",
        });
        await bucket.delete(fileId);
        res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};