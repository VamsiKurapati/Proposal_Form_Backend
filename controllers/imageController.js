require('dotenv').config();

const mongoose = require("mongoose");

exports.serveImage = async (req, res) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "uploads",
        });
        const fileId = new mongoose.Types.ObjectId(req.params.filename);
        const downloadStream = bucket.openDownloadStream(fileId);
        downloadStream.on("error", () => res.status(404).send("File not found"));
        downloadStream.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};