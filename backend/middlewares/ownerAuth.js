const mongoose = require("mongoose");
const Restaurant = require("../models/restaurant");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("./catchAsyncErrors");

/**
 * Ensures user has restaurant_owner or admin role.
 */
exports.authorizeOwnerRole = (req, res, next) => {
  if (!req.user) {
    return next(new ErrorHandler("Please login to access this resource", 401));
  }

  const allowedRoles = ["restaurant_owner", "owner", "admin"];
  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new ErrorHandler(
        `Role '${req.user.role}' is not authorized to access the restaurant owner panel`,
        403
      )
    );
  }

  next();
};

/**
 * Reusable helper to verify restaurant ownership.
 * Admin can manage all restaurants.
 * Owner can only manage their own restaurant.
 */
exports.verifyRestaurantOwnership = async (restaurantId, user) => {
  if (!restaurantId) {
    throw new ErrorHandler("Restaurant ID is required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw new ErrorHandler("Invalid Restaurant ID format", 400);
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new ErrorHandler("Restaurant not found", 404);
  }

  // Admin has access to all restaurants
  if (user.role === "admin") {
    return restaurant;
  }

  // Check ownership
  if (!restaurant.owner || restaurant.owner.toString() !== user._id.toString()) {
    throw new ErrorHandler(
      "You are not authorized to access or modify this restaurant",
      403
    );
  }

  return restaurant;
};

/**
 * Middleware version of ownership check
 */
exports.checkRestaurantOwner = catchAsyncErrors(async (req, res, next) => {
  const restaurantId =
    req.params.id ||
    req.params.restaurantId ||
    req.body.restaurantId ||
    req.query.restaurantId;

  const restaurant = await exports.verifyRestaurantOwnership(restaurantId, req.user);
  req.restaurant = restaurant;
  next();
});

