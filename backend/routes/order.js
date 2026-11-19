const express = require("express");
const router = express.Router();

const {
  newOrder,
  newCodOrder,
  getSingleOrder,
  myOrders,
  updateOrderStatus,
  allOrders,
} = require("../controllers/orderController");

const authController = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

router.route("/new").post(authController.protect, newOrder);
router.route("/cod").post(authController.protect, newCodOrder);
router.route("/me/myOrders").get(authController.protect, myOrders);
router.route("/admin/all").get(authController.protect, authorizeRoles('admin'), allOrders);
router.route("/:id").get(authController.protect, getSingleOrder);
router.route("/:id/status").put(authController.protect, updateOrderStatus);

module.exports = router;
