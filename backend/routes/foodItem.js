const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  getFoodItem,
  createFoodItem,
  getAllFoodItems,
  deleteFoodItem,
  updateFoodItem,
  searchFoodItems,
  addFoodReview,
  getFoodReviews,
} = require("../controllers/foodItemController");

const { protect } = require("../controllers/authController");
const { authorizeRoles } = require("../middlewares/authorizeRoles");

// Food Search with Filters
router.route("/search").get(searchFoodItems);
router.route("/").get(searchFoodItems);

// Reviews
router
  .route("/item/:foodId/reviews")
  .get(getFoodReviews)
  .post(protect, addFoodReview);

router.route("/item").post(protect, authorizeRoles("admin"), createFoodItem);

router.route("/items/:storeId").get(getAllFoodItems);
router
  .route("/item/:foodId")
  .get(getFoodItem)
  .patch(protect, authorizeRoles("admin"), updateFoodItem)
  .delete(protect, authorizeRoles("admin"), deleteFoodItem);

module.exports = router;
