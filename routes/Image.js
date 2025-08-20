const express = require("express");
const router = express.Router();

const verifyUser = require('../utils/verifyUser');

const { serveTemplateImage, uploadTemplateImage, uploadImage, serveImageById, serveImageByFilename, deleteImage, cleanupCorruptedFiles, deleteCorruptedFile } = require("../controllers/imageController");

router.get("/get_image/:fileId", serveImageById);
router.get("/get_image_by_name/:filename", serveImageByFilename);
router.get("/get_template_image/:filename", serveTemplateImage);

router.post("/upload_image", verifyUser(["company", "employee", "SuperAdmin"]), uploadImage);
router.post("/upload_template_image", verifyUser(["SuperAdmin"]), uploadTemplateImage);

router.delete("/delete_image/:fileId", verifyUser(["company", "employee"]), deleteImage);

// New routes for handling corrupted files
router.get("/check_corrupted_files", verifyUser(["SuperAdmin"]), cleanupCorruptedFiles);
router.delete("/delete_corrupted_file/:fileId", verifyUser(["SuperAdmin"]), deleteCorruptedFile);

module.exports = router;