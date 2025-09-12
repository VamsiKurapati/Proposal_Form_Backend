const express = require("express");
const router = express.Router();

const verifyUser = require('../utils/verifyUser');

const { serveTemplateImage, uploadTemplateImage, uploadImage, serveCloudImage, serveImageById, deleteImage, deleteImageById } = require("../controllers/imageController");

router.get("/get_image_by_name/:filename", serveCloudImage);
router.get("/get_image_by_id/:fileId", serveImageById);
router.get("/get_image/:filename", serveCloudImage);
router.get("/get_template_image/:filename", serveTemplateImage);

router.post("/upload_image", verifyUser(["company", "employee", "SuperAdmin"]), uploadImage);
router.post("/upload_template_image", verifyUser(["SuperAdmin"]), uploadTemplateImage);

router.delete("/delete_image/:filename", verifyUser(["company", "employee"]), deleteImage);
router.delete("/delete_image_by_id/:fileId", verifyUser(["company", "employee"]), deleteImageById);

module.exports = router;