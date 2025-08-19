const express = require("express");

const router = express.Router();

const { serveImage } = require("../controllers/imageController");

router.get("/getFile/:filename", serveImage);