const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

const {
  processPayment,
  sendStripeApiKey,
} = require("../controllers/paymentController");

router.post("/process", authController.protect, processPayment);

router.get(
  "/stripeapi",
  authController.protect,
  sendStripeApiKey
);

module.exports = router;