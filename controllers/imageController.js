require('dotenv').config();

const mongoose = require("mongoose");
const gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads"
});

exports.serveImage = async (req, res) => {
    const { filename } = req.params;
    const file = await mongoose.connection.db.collection("uploads.files").findOne({ filename });
    if (!file) {
        return res.status(404).json({ message: "File not found" });
    }
    const readStream = gridfsBucket.openDownloadStream(file._id);
    readStream.pipe(res);
};