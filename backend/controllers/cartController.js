const Cart = require("../models/cart");
const FoodItem = require("../models/fooditem");
const Restaurant = require("../models/restaurant");
const mongoose = require("mongoose");
const LocalStore = require("../utils/localStore");

async function addItemToCart(req, res) {
  const { foodItemId, restaurantId, quantity = 1 } = req.body;
  const userId = req.user?.id || req.user?._id || "default_user";

  // Fallback if DB is offline
  if (mongoose.connection.readyState !== 1) {
    const cart = LocalStore.getCart(userId);
    cart.restaurant = restaurantId;
    const existingIndex = (cart.items || []).findIndex(
      (it) => it.foodItem?._id === foodItemId || it.foodItem === foodItemId
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += Number(quantity);
    } else {
      cart.items = cart.items || [];
      cart.items.push({
        foodItem: { _id: foodItemId, name: "Delicious Item", price: 199 },
        quantity: Number(quantity),
      });
    }
    LocalStore.saveCart(userId, cart);
    return res.status(200).json({ message: "Cart updated", cart });
  }

  try {
    const foodItem = await FoodItem.findById(foodItemId);
    if (!foodItem) {
      return res.status(404).json({ message: "Food item not found" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    let cart = await Cart.findOne({ user: userId });

    if (cart) {
      if (cart.restaurant.toString() !== restaurantId) {
        await Cart.deleteOne({ _id: cart._id });
        cart = new Cart({
          user: userId,
          restaurant: restaurantId,
          items: [{ foodItem: foodItemId, quantity }],
        });
      } else {
        const itemIndex = cart.items.findIndex(
          (item) => item.foodItem.toString() === foodItemId
        );
        if (itemIndex > -1) {
          cart.items[itemIndex].quantity += quantity;
        } else {
          cart.items.push({ foodItem: foodItemId, quantity });
        }
      }
    } else {
      cart = new Cart({
        user: userId,
        restaurant: restaurantId,
        items: [{ foodItem: foodItemId, quantity }],
      });
    }

    await cart.save();

    // Fetch and return the populated cart
    const updatedCart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.foodItem",
        select: "name price image images",
      })
      .populate({
        path: "restaurant",
        select: "name",
      });

    res.status(200).json({ message: "Cart updated", cart: updatedCart });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}

// Update Cart

async function updateCartItemQuantity(req, res) {
  const { foodItemId, quantity } = req.body;
  const userId = req.user?._id || req.body?.userId || "default_user";

  if (mongoose.connection.readyState !== 1) {
    const cart = LocalStore.getCart(userId);
    const item = (cart.items || []).find(
      (it) => it.foodItem?._id === foodItemId || it.foodItem === foodItemId
    );
    if (item) {
      item.quantity = Number(quantity);
      LocalStore.saveCart(userId, cart);
    }
    return res.status(200).json({ message: "Cart item quantity updated", cart });
  }

  try {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.foodItem.toString() === foodItemId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Food item not found in cart" });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // Fetch and return the populated cart
    const updatedCart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.foodItem",
        select: "name price image images",
      })
      .populate({
        path: "restaurant",
        select: "name",
      });

    res
      .status(200)
      .json({ message: "Cart item quantity updated", cart: updatedCart });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

//Delete cart

async function deleteCartItem(req, res) {
  const userId = req.user?._id || req.body?.userId || "default_user";
  const { foodItemId } = req.body;

  if (mongoose.connection.readyState !== 1) {
    const cart = LocalStore.getCart(userId);
    cart.items = (cart.items || []).filter(
      (it) => it.foodItem?._id !== foodItemId && it.foodItem !== foodItemId
    );
    LocalStore.saveCart(userId, cart);
    return res.status(200).json({ message: "Cart item deleted", cart });
  }

  try {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.foodItem.toString() === foodItemId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Food item not found in cart" });
    }

    cart.items.splice(itemIndex, 1);

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      return res.status(200).json({ message: "Cart deleted" });
    } else {
      await cart.save();

      // Fetch and return the populated cart
      const updatedCart = await Cart.findOne({ user: userId })
        .populate({
          path: "items.foodItem",
          select: "name price images",
        })
        .populate({
          path: "restaurant",
          select: "name",
        });

      res.status(200).json({ message: "Cart item deleted", cart: updatedCart });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function clearEntireCart(req, res) {
  const userId = req.user?._id || req.body?.userId || "default_user";
  if (mongoose.connection.readyState !== 1) {
    LocalStore.clearCart(userId);
    return res.status(200).json({ status: "success", message: "Cart cleared" });
  }

  try {
    await Cart.deleteMany({ user: userId });
    return res.status(200).json({ status: "success", message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

//Fetch cart Item

async function getCartItem(req, res) {
  const userId = req.user?._id || req.user?.id || "default_user";

  if (mongoose.connection.readyState !== 1) {
    const cart = LocalStore.getCart(userId);
    return res.status(200).json({ status: "success", data: cart });
  }

  try {
    let cart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.foodItem",
        select: "name price image images isVeg description",
      })
      .populate({
        path: "restaurant",
        select: "name address location images",
      });

    if (!cart) {
      return res.status(200).json({
        status: "success",
        data: { items: [], restaurant: null }
      });
    }

    // Clean up any orphan/deleted food items or restaurant
    const validItems = (cart.items || []).filter(
      (item) => item && item.foodItem && item.foodItem.name && item.foodItem.price
    );

    if (validItems.length === 0 || !cart.restaurant) {
      await Cart.deleteOne({ _id: cart._id });
      return res.status(200).json({
        status: "success",
        data: { items: [], restaurant: null }
      });
    }

    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    return res.status(200).json({ status: "success", data: cart });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = {
  addItemToCart,
  updateCartItemQuantity,
  deleteCartItem,
  clearEntireCart,
  getCartItem,
};
