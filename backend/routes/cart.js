const express = require("express");
const router = express.Router();

const {
  addItemToCart,
  updateCartItemQuantity,
  deleteCartItem,
  clearEntireCart,
  getCartItem,
} = require("../controllers/cartController");

const { protect } = require("../controllers/authController");

router.post("/add-to-cart", protect, addItemToCart);
router.post("/update-cart-item", protect, updateCartItemQuantity);
router.delete("/delete-cart-item", protect, deleteCartItem);
router.delete("/clear", protect, clearEntireCart);
router.delete("/", protect, clearEntireCart);
router.get("/", protect, getCartItem);

module.exports = router;