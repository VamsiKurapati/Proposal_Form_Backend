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
                // Generate unique filename to prevent duplicates
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const fileExtension = file.originalname.split('.').pop();
                const fileNameWithoutExt = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
                const uniqueFilename = `${fileNameWithoutExt}_${uniqueSuffix}.${fileExtension}`;

                resolve({
                    filename: uniqueFilename,
                    bucketName: "template_images",
                    metadata: {
                        originalname: file.originalname,
                        uploadedAt: new Date(),
                        uniqueId: buf.toString('hex')
                    },
                });
            });
        });
    },
});

const upload = multer({ storage });

const storage2 = new GridFsStorage({
    url: process.env.MONGO_URI,
    file: (req, file) => {
        console.log("=== GridFS Storage2 Configuration ===");
        console.log("File being processed:", file);
        console.log("MONGO_URI:", process.env.MONGO_URI);

        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    console.error("Crypto error:", err);
                    return reject(err);
                }
                // Generate unique filename to prevent duplicates
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const fileExtension = file.originalname.split('.').pop();
                const fileNameWithoutExt = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
                const uniqueFilename = `${fileNameWithoutExt}_${uniqueSuffix}.${fileExtension}`;

                console.log("Generated filename:", uniqueFilename);

                const fileConfig = {
                    filename: uniqueFilename,
                    bucketName: "cloud_images",
                    metadata: {
                        originalname: file.originalname,
                        uploadedAt: new Date(),
                        uniqueId: buf.toString('hex')
                    },
                };

                console.log("File config:", fileConfig);
                resolve(fileConfig);
            });
        });
    },
});

// Add comprehensive debugging for storage2
storage2.on('connection', (connection) => {
    console.log('✅ GridFS Storage2 connected successfully');
    console.log('Connection details:', connection);
});

storage2.on('connectionFailed', (error) => {
    console.error('❌ GridFS Storage2 connection failed:', error);
});

storage2.on('file', (file) => {
    console.log('📁 GridFS Storage2 file event triggered:', file);
});

storage2.on('error', (error) => {
    console.error('💥 GridFS Storage2 error:', error);
});

// Add debugging for the multer instance
const upload2 = multer({
    storage: storage2,
    limits: {
        fileSize: 1 * 1024 * 1024, // 1MB limit
    }
});

console.log("=== Multer Configuration Debug ===");
console.log("storage2:", storage2);
console.log("upload2:", upload2);
console.log("storage2.ready:", storage2.ready);
console.log("storage2.connection:", storage2.connection);

// Add debugging to the singleImageUpload middleware
const singleImageUpload = upload2.single('image');

// Wrap the middleware with debugging
const singleImageUploadWithDebug = (req, res, next) => {
    console.log("=== Multer Middleware Debug ===");
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
    console.log("Content-Type:", req.get('Content-Type'));

    singleImageUpload(req, res, (err) => {
        if (err) {
            console.error("❌ Multer error:", err);
            console.error("Multer error code:", err.code);
            console.error("Multer error field:", err.field);
            return next(err);
        }

        console.log("✅ Multer middleware completed successfully");
        console.log("req.file after multer:", req.file);
        console.log("req.files after multer:", req.files);
        console.log("req.body after multer:", req.body);

        next();
    });
};

const singleTemplateImageUpload = upload.single('image');

exports.uploadTemplateImage = [
    singleTemplateImageUpload,
    async (req, res) => {
        try {
            // Use _id instead of id for GridFS files
            const fileId = req.file._id;
            const filename = req.file.filename;
            const originalName = req.file.originalname;

            res.status(200).json({
                message: "Image uploaded successfully",
                fileId,
                filename,
                originalName
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
];

exports.uploadImage = [
    singleImageUploadWithDebug,
    async (req, res) => {
        try {
            console.log("=== uploadImage function called ===");
            console.log("Request method:", req.method);
            console.log("Request URL:", req.url);
            console.log("Request headers:", req.headers);
            console.log("Request body:", req.body);
            console.log("req.file:", req.file);
            console.log("req.file type:", typeof req.file);
            console.log("req.file keys:", req.file ? Object.keys(req.file) : 'No file object');

            if (req.file) {
                console.log("req.file._id:", req.file._id);
                console.log("req.file.filename:", req.file.filename);
                console.log("req.file.originalname:", req.file.originalname);
                console.log("req.file.fieldname:", req.file.fieldname);
                console.log("req.file.encoding:", req.file.encoding);
                console.log("req.file.mimetype:", req.file.mimetype);
                console.log("req.file.size:", req.file.size);
                console.log("req.file.buffer:", req.file.buffer ? 'Buffer present' : 'No buffer');
            } else {
                console.error("❌ req.file is undefined or null!");
            }

            // Use _id instead of id for GridFS files
            const fileId = req.file?._id;
            const filename = req.file?.filename;
            const originalName = req.file?.originalname;

            console.log("Extracted values:");
            console.log("- fileId:", fileId);
            console.log("- filename:", filename);
            console.log("- originalName:", originalName);

            // Verify the file was actually stored in the database
            try {
                const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
                    bucketName: "cloud_images",
                });

                if (fileId) {
                    const storedFile = await bucket.find({ _id: fileId }).toArray();
                    console.log("File found in database:", storedFile);

                    if (storedFile.length === 0) {
                        console.error("WARNING: File was not found in database after upload!");
                    } else {
                        console.log("SUCCESS: File confirmed in database");
                    }
                } else {
                    console.error("❌ Cannot check database - fileId is undefined!");
                }
            } catch (dbError) {
                console.error("Error checking database:", dbError);
            }

            const response = {
                message: "Image uploaded successfully",
                fileId,
                filename,
                originalName
            };

            console.log("Sending response:", response);
            res.status(201).json(response);
        } catch (error) {
            console.error("Error in uploadImage:", error);
            console.error("Error stack:", error.stack);
            res.status(500).json({ message: error.message });
        }
    }
];

exports.serveTemplateImage = async (req, res) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "template_images",
        });

        const filename = req.params.filename;
        console.log('Requested filename:', filename);

        // Find file by filename (should be unique now)
        const file = await bucket.find({ filename: filename }).toArray();

        if (!file || file.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }

        // If multiple files found (shouldn't happen with unique filenames), log warning
        if (file.length > 1) {
            console.warn(`Multiple files found with filename: ${filename}. Using first match.`);
        }

        const fileDoc = file[0];
        const fileId = fileDoc._id;
        console.log('File found:', fileDoc);
        console.log('File ID:', fileId);

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
            'Content-Type': fileDoc.contentType || 'application/octet-stream',
            'Content-Length': fileDoc.length,
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

exports.serveCloudImage = async (req, res) => {
    try {
        const filename = req.params.filename;
        console.log('Requested filename:', filename);

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "cloud_images",
        });

        // Find file by filename (should be unique now)
        const file = await bucket.find({ filename: filename }).toArray();

        if (!file || file.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }

        // If multiple files found (shouldn't happen with unique filenames), log warning
        if (file.length > 1) {
            console.warn(`Multiple files found with filename: ${filename}. Using first match.`);
        }

        const fileDoc = file[0];
        const fileId = fileDoc._id;
        console.log('File found:', fileDoc);
        console.log('File ID:', fileId);

        // Check if file chunks are intact
        const chunksCollection = mongoose.connection.db.collection('cloud_images.chunks');
        const chunks = await chunksCollection.find({ files_id: fileId }).sort({ n: 1 }).toArray();

        if (chunks.length === 0) {
            console.error("No chunks found for file:", fileId);
            return res.status(500).json({ message: "File chunks are missing or corrupted" });
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
        console.error("Error in serveImageByFilename:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
};

exports.deleteImage = async (req, res) => {
    try {
        const filename = req.params.filename;
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "cloud_images",
        });

        // Find file by filename (should be unique now)
        const file = await bucket.find({ filename: filename }).toArray();

        if (!file || file.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }

        // If multiple files found (shouldn't happen with unique filenames), log warning
        if (file.length > 1) {
            console.warn(`Multiple files found with filename: ${filename}. Deleting first match.`);
        }

        const fileId = file[0]._id;
        await bucket.delete(fileId);
        res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// New function to get image by ID (more reliable than filename)
exports.serveImageById = async (req, res) => {
    try {
        const fileId = req.params.fileId;

        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ message: "Invalid file ID format" });
        }

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "cloud_images",
        });

        const file = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();

        if (!file || file.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }

        const fileDoc = file[0];

        // Set appropriate headers
        res.set({
            'Content-Type': fileDoc.contentType || 'application/octet-stream',
            'Content-Length': fileDoc.length,
            'Cache-Control': 'public, max-age=31536000'
        });

        const downloadStream = bucket.openDownloadStream(fileDoc._id);
        downloadStream.pipe(res);

    } catch (error) {
        console.error("Error serving image by ID:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
};