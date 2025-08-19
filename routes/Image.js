const express = require("express");
const router = express.Router();

const verifyUser = require('../utils/verifyUser');

const { serveTemplateImage, uploadTemplateImage, uploadImage, serveImageById, serveImageByFilename, deleteImage } = require("../controllers/imageController");

router.get("/get_image/:fileId", serveImageById);
router.get("/get_image_by_name/:filename", serveImageByFilename);
router.get("/get_template_image/:filename", serveTemplateImage);

router.post("/upload_image", verifyUser(["company", "employee", "SuperAdmin"]), uploadImage);
router.post("/upload_template_image", verifyUser(["SuperAdmin"]), uploadTemplateImage);

router.delete("/delete_image/:fileId", verifyUser(["company", "employee"]), deleteImage);

module.exports = router;