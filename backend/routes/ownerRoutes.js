const express = require("express");
const router = express.Router();

const { protect } = require("../controllers/authController");
const { authorizeOwnerRole } = require("../middlewares/ownerAuth");
const {
  getMyRestaurants,
  getDashboardStats,
  getOwnerRestaurant,
  createOwnerRestaurant,
  updateOwnerRestaurant,
  getOwnerFoodItems,
  createOwnerFoodItem,
  updateOwnerFoodItem,
  deleteOwnerFoodItem,
  getOwnerOrders,
  updateOwnerOrderStatus,
} = require("../controllers/ownerController");

// All owner routes require authentication and restaurant_owner or admin role
router.use(protect);
router.use(authorizeOwnerRole);

// =================== Step 1 & 2: Dashboard & Restaurants ===================
router.route("/restaurants").get(getMyRestaurants);
router.route("/dashboard").get(getDashboardStats);

// =================== Step 3: Restaurant Management ===================
router.route("/restaurant/new").post(createOwnerRestaurant);
router
  .route("/restaurant/:id")
  .get(getOwnerRestaurant)
  .put(updateOwnerRestaurant);

// =================== Step 4: Food & Menu CRUD ===================
router
  .route("/restaurant/:restaurantId/foods")
  .get(getOwnerFoodItems)
  .post(createOwnerFoodItem);

router
  .route("/restaurant/:restaurantId/food")
  .post(createOwnerFoodItem);

router
  .route("/food/:foodId")
  .put(updateOwnerFoodItem)
  .delete(deleteOwnerFoodItem);

// =================== Step 5: Order Management ===================
router.route("/orders").get(getOwnerOrders);
router.route("/orders/:orderId/status").put(updateOwnerOrderStatus);

module.exports = router;
