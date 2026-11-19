const express = require("express");
const router = express.Router();

const { protect } = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

const {
  registerDeliveryPartner,
  getPartnerProfile,
  updatePartnerProfile,
  updateAvailability,
  getAvailableOrders,
  getMyDeliveries,
  getSingleDeliveryOrder,
  markOrderPickedUp,
  markOrderOutForDelivery,
  markOrderDelivered,
  updateLocationREST,
  getPartnerEarnings,
  getAllDeliveryPartners,
  verifyDeliveryPartner,
  assignOrderToPartner,
  getOrderTracking,
} = require("../controllers/deliveryPartnerController");

// ================= DELIVERY PARTNER APIS =================

// Registration (authenticated users can apply)
router.post("/register", protect, registerDeliveryPartner);

// Profile & Availability
router.get("/profile/me", protect, authorizeRoles("delivery_partner", "admin"), getPartnerProfile);
router.put("/profile/me", protect, authorizeRoles("delivery_partner", "admin"), updatePartnerProfile);
router.put("/availability", protect, authorizeRoles("delivery_partner", "admin"), updateAvailability);

// Tracking (Customer & assigned partner)
router.get("/orders/:id/track", protect, getOrderTracking);

// Orders & Workflow
router.get("/orders/available", protect, authorizeRoles("delivery_partner", "admin"), getAvailableOrders);
router.get("/orders/my-deliveries", protect, authorizeRoles("delivery_partner", "admin"), getMyDeliveries);
router.get("/orders/:id", protect, authorizeRoles("delivery_partner", "admin"), getSingleDeliveryOrder);
router.put("/orders/:id/pickup", protect, authorizeRoles("delivery_partner", "admin"), markOrderPickedUp);
router.put("/orders/:id/out-for-delivery", protect, authorizeRoles("delivery_partner", "admin"), markOrderOutForDelivery);
router.put("/orders/:id/deliver", protect, authorizeRoles("delivery_partner", "admin"), markOrderDelivered);

// Live GPS Location
router.post("/location", protect, authorizeRoles("delivery_partner", "admin"), updateLocationREST);

// Earnings
router.get("/earnings", protect, authorizeRoles("delivery_partner", "admin"), getPartnerEarnings);

// ================= ADMIN APIS FOR DELIVERY PARTNERS =================
router.get("/admin/partners", protect, authorizeRoles("admin"), getAllDeliveryPartners);
router.put("/admin/partners/:id/verify", protect, authorizeRoles("admin"), verifyDeliveryPartner);
router.post("/admin/orders/:id/assign", protect, authorizeRoles("admin"), assignOrderToPartner);

module.exports = router;
