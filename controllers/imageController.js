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
        const file = await bucket.find({ filename: req.params.filename }).toArray();
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }
        const fileId = file[0]._id;
        const downloadStream = bucket.openDownloadStream(fileId);
        downloadStream.on("error", () => res.status(404).send("File not found"));
        downloadStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        const downloadStream = bucket.openDownloadStream(fileId);
        downloadStream.on("error", () => res.status(404).send("File not found"));
        downloadStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.serveImageByFilename = async (req, res) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "uploads",
        });
        const file = await bucket.find({ filename: req.params.filename }).toArray();
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }
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