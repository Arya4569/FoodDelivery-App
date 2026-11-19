const express = require("express");
const router = express.Router();

const {
    signUp,
    login,
    logout,
    getMe,
    protect,
    toggleFavouriteRestaurant,
    toggleFavouriteFoodItem,
    getWishlist,
    updateMe,
    changePassword,
    getAddresses,
    addAddress,
    deleteAddress,
    setDefaultAddress
} = require("../controllers/authController");

const { authorizeRoles } = require('../middlewares/authorizeRoles');
const User = require('../models/user');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');

// Register
router.post("/register", signUp);

// Login
router.post("/login", login);

// Logout
router.get("/logout", logout);

// Current User
router.get("/me", protect, getMe);

// Update profile
router.put("/me", protect, updateMe);

// Change password
router.post("/change-password", protect, changePassword);

// Admin: get all users
router.get('/admin/users', protect, authorizeRoles('admin'), catchAsyncErrors(async (req, res) => {
  const users = await User.find();
  res.status(200).json({ success: true, count: users.length, users });
}));

// Address Management Routes
router.get("/addresses", protect, getAddresses);
router.post("/addresses", protect, addAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);
router.put("/addresses/:addressId/default", protect, setDefaultAddress);

// Wishlist Routes
router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/restaurant/:id", protect, toggleFavouriteRestaurant);
router.post("/wishlist/fooditem/:id", protect, toggleFavouriteFoodItem);

module.exports = router;