const express = require("express");
const router = express.Router();
const {
  reverseGeocode,
  searchLocations,
  detectByIP,
} = require("../controllers/locationController");

router.get("/reverse", reverseGeocode);
router.get("/search", searchLocations);
router.get("/ip", detectByIP);

module.exports = router;

