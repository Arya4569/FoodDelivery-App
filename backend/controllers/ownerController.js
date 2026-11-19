const mongoose = require("mongoose");
const Restaurant = require("../models/restaurant");
const FoodItem = require("../models/fooditem");
const Menu = require("../models/menu");
const Order = require("../models/order");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const cloudinary = require("../config/cloudinary");
const { verifyRestaurantOwnership } = require("../middlewares/ownerAuth");
const { emitOrderLifecycleEvent } = require("../socket/socketHandler");

// =========================================================================
// HELPER: Upload base64 image to Cloudinary with fallback / validation
// =========================================================================
async function uploadToCloudinary(base64Data, folder = "restaurants") {
  if (!base64Data || typeof base64Data !== "string") return null;

  // If already a remote URL, keep as is
  if (base64Data.startsWith("http://") || base64Data.startsWith("https://")) {
    return {
      public_id: "external_" + Date.now(),
      url: base64Data,
    };
  }

  // Base64 payload validation
  if (!base64Data.startsWith("data:image/")) {
    throw new ErrorHandler("Invalid image format. Must be an image data URI", 400);
  }

  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder,
      resource_type: "image",
    });
    return {
      public_id: result.public_id,
      url: result.secure_url,
    };
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    throw new ErrorHandler("Image upload to Cloudinary failed: " + err.message, 500);
  }
}

// =========================================================================
// STEP 1 & 2: RESTAURANT OWNER DASHBOARD & RESTAURANTS LIST
// =========================================================================

/**
 * Get all restaurants owned by the authenticated owner (or all for admin)
 */
exports.getMyRestaurants = catchAsyncErrors(async (req, res, next) => {
  let filter = {};
  if (req.user.role !== "admin") {
    filter = { owner: req.user._id };
  } else if (req.query.owner) {
    filter = { owner: req.query.owner };
  }

  const restaurants = await Restaurant.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: restaurants.length,
    restaurants,
  });
});

/**
 * Get real-time dashboard statistics calculated from database records
 */
exports.getDashboardStats = catchAsyncErrors(async (req, res, next) => {
  const { restaurantId } = req.query;

  let restaurantIds = [];

  if (restaurantId) {
    // Verify ownership of the specified restaurant
    await verifyRestaurantOwnership(restaurantId, req.user);
    restaurantIds = [new mongoose.Types.ObjectId(restaurantId)];
  } else {
    // If no specific restaurant specified, get all restaurants owned by user (or all if admin)
    const filter = req.user.role === "admin" ? {} : { owner: req.user._id };
    const myRestaurants = await Restaurant.find(filter).select("_id");
    restaurantIds = myRestaurants.map((r) => r._id);
  }

  if (restaurantIds.length === 0) {
    return res.status(200).json({
      success: true,
      stats: {
        totalOrders: 0,
        todayOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        recentOrders: [],
        topSellingItems: [],
        totalDishes: 0,
        activeRestaurants: 0,
      },
    });
  }

  // Fetch all orders for these restaurants
  const orders = await Order.find({ restaurant: { $in: restaurantIds } })
    .populate("user", "name email phoneNumber")
    .populate("restaurant", "name")
    .sort({ createdAt: -1 });

  // Today boundaries
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  let totalRevenue = 0;
  let todayOrders = 0;
  let pendingOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;

  const itemSalesMap = {};

  orders.forEach((ord) => {
    const isToday = ord.createdAt >= startOfToday && ord.createdAt <= endOfToday;
    if (isToday) todayOrders += 1;

    const isCancelled =
      ord.orderStatus === "Cancelled" || ord.orderStatus === "Rejected";

    if (ord.orderStatus === "Delivered") {
      completedOrders += 1;
      totalRevenue += ord.finalTotal || 0;
    } else if (isCancelled) {
      cancelledOrders += 1;
    } else {
      pendingOrders += 1;
      // If paid online or confirmed, add to total revenue
      if (ord.paymentInfo?.status === "paid" || ord.paymentInfo?.status === "Paid") {
        totalRevenue += ord.finalTotal || 0;
      }
    }

    // Tally item sales for top selling items if not cancelled
    if (!isCancelled && Array.isArray(ord.orderItems)) {
      ord.orderItems.forEach((item) => {
        const id = item.fooditem?.toString() || item.name;
        if (!itemSalesMap[id]) {
          itemSalesMap[id] = {
            id,
            name: item.name,
            quantity: 0,
            revenue: 0,
            image: item.image,
          };
        }
        itemSalesMap[id].quantity += item.quantity || 1;
        itemSalesMap[id].revenue += (item.price || 0) * (item.quantity || 1);
      });
    }
  });

  const topSellingItems = Object.values(itemSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const totalDishes = await FoodItem.countDocuments({
    restaurant: { $in: restaurantIds },
  });

  const activeRestaurants = await Restaurant.countDocuments({
    _id: { $in: restaurantIds },
    isOpen: true,
  });

  res.status(200).json({
    success: true,
    stats: {
      totalOrders: orders.length,
      todayOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue: Math.round(totalRevenue),
      recentOrders: orders.slice(0, 10),
      topSellingItems,
      totalDishes,
      activeRestaurants,
    },
  });
});

// =========================================================================
// STEP 3: RESTAURANT MANAGEMENT
// =========================================================================

/**
 * Get restaurant details for owner
 */
exports.getOwnerRestaurant = catchAsyncErrors(async (req, res, next) => {
  const restaurant = await verifyRestaurantOwnership(req.params.id, req.user);

  res.status(200).json({
    success: true,
    restaurant,
  });
});

/**
 * Create a new restaurant by an authenticated owner
 */
exports.createOwnerRestaurant = catchAsyncErrors(async (req, res, next) => {
  const {
    name,
    address,
    description,
    phoneNumber,
    isVeg,
    openingTime,
    closingTime,
    deliveryTime,
    deliveryRadius,
    image,
  } = req.body;

  if (!name || name.trim() === "") {
    return next(new ErrorHandler("Please enter restaurant name", 400));
  }

  if (!address || address.trim() === "") {
    return next(new ErrorHandler("Please enter restaurant address", 400));
  }

  const restaurantData = {
    name: name.trim(),
    address: address.trim(),
    description: description || "",
    phoneNumber: phoneNumber || "",
    isVeg: isVeg === true || isVeg === "true",
    openingTime: openingTime || "09:00",
    closingTime: closingTime || "23:00",
    deliveryTime: Number(deliveryTime) || 30,
    deliveryRadius: Number(deliveryRadius) || 10,
    owner: req.user._id,
    isOpen: true,
    location: {
      type: "Point",
      coordinates: [73.8567, 18.5204],
    },
    images: [],
  };

  if (image) {
    const uploaded = await uploadToCloudinary(image, "restaurants");
    if (uploaded) {
      restaurantData.images.push(uploaded);
    }
  } else {
    restaurantData.images.push({
      public_id: "default_restaurant",
      url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    });
  }

  const restaurant = await Restaurant.create(restaurantData);

  // Automatically create a default Menu for this restaurant
  await Menu.create({
    name: `${restaurant.name} Menu`,
    restaurant: restaurant._id,
  });

  res.status(201).json({
    success: true,
    message: "Restaurant created successfully",
    restaurant,
  });
});

/**
 * Update restaurant details (ownership strictly enforced)
 */
exports.updateOwnerRestaurant = catchAsyncErrors(async (req, res, next) => {
  const restaurant = await verifyRestaurantOwnership(req.params.id, req.user);

  const {
    name,
    description,
    phoneNumber,
    address,
    isVeg,
    isOpen,
    openingTime,
    closingTime,
    deliveryTime,
    deliveryRadius,
    image,
  } = req.body;

  if (name !== undefined) {
    if (!name.trim()) return next(new ErrorHandler("Restaurant name cannot be empty", 400));
    restaurant.name = name.trim();
  }

  if (description !== undefined) restaurant.description = description;
  if (phoneNumber !== undefined) restaurant.phoneNumber = phoneNumber;
  if (address !== undefined) {
    if (!address.trim()) return next(new ErrorHandler("Address cannot be empty", 400));
    restaurant.address = address.trim();
  }

  if (isVeg !== undefined) restaurant.isVeg = isVeg === true || isVeg === "true";
  if (isOpen !== undefined) restaurant.isOpen = isOpen === true || isOpen === "true";
  if (openingTime !== undefined) restaurant.openingTime = openingTime;
  if (closingTime !== undefined) restaurant.closingTime = closingTime;

  if (deliveryTime !== undefined) {
    const dTime = Number(deliveryTime);
    if (isNaN(dTime) || dTime <= 0) {
      return next(new ErrorHandler("Delivery time must be a positive number", 400));
    }
    restaurant.deliveryTime = dTime;
  }

  if (deliveryRadius !== undefined) {
    const dRad = Number(deliveryRadius);
    if (isNaN(dRad) || dRad <= 0) {
      return next(new ErrorHandler("Delivery radius must be a positive number", 400));
    }
    restaurant.deliveryRadius = dRad;
  }

  // Handle image upload if a new image is provided
  if (image && typeof image === "string" && image.startsWith("data:image/")) {
    const uploaded = await uploadToCloudinary(image, "restaurants");
    if (uploaded) {
      restaurant.images = [uploaded];
    }
  }

  await restaurant.save();

  res.status(200).json({
    success: true,
    message: "Restaurant details updated successfully",
    restaurant,
  });
});

// =========================================================================
// STEP 4: FOOD & MENU CRUD
// =========================================================================

/**
 * Get all food items for a restaurant owned by the user
 */
exports.getOwnerFoodItems = catchAsyncErrors(async (req, res, next) => {
  const { restaurantId } = req.params;
  await verifyRestaurantOwnership(restaurantId, req.user);

  const { keyword, category, isVeg, isAvailable } = req.query;

  const query = { restaurant: restaurantId };

  if (keyword && keyword.trim()) {
    const regex = new RegExp(keyword.trim(), "i");
    query.$or = [{ name: regex }, { description: regex }, { category: regex }];
  }

  if (category && category !== "All") {
    query.category = new RegExp(category.trim(), "i");
  }

  if (isVeg !== undefined && isVeg !== "") {
    query.isVeg = isVeg === "true" || isVeg === true;
  }

  if (isAvailable !== undefined && isAvailable !== "") {
    query.isAvailable = isAvailable === "true" || isAvailable === true;
  }

  const foodItems = await FoodItem.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: foodItems.length,
    foodItems,
  });
});

/**
 * Add a new food item to the owner's restaurant
 */
exports.createOwnerFoodItem = catchAsyncErrors(async (req, res, next) => {
  const { restaurantId } = req.params;
  const restaurant = await verifyRestaurantOwnership(restaurantId, req.user);

  const {
    name,
    price,
    description,
    category,
    spiceLevel,
    isVeg,
    isAvailable,
    stock,
    image,
  } = req.body;

  if (!name || !name.trim()) {
    return next(new ErrorHandler("Food item name is required", 400));
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return next(new ErrorHandler("Valid food price is required", 400));
  }

  if (!description || !description.trim()) {
    return next(new ErrorHandler("Food item description is required", 400));
  }

  // Find or create Menu for this restaurant
  let menu = await Menu.findOne({ restaurant: restaurant._id });
  if (!menu) {
    menu = await Menu.create({
      name: `${restaurant.name} Menu`,
      restaurant: restaurant._id,
    });
  }

  // Handle Image Upload
  let imageArray = [];
  if (image && typeof image === "string") {
    const uploaded = await uploadToCloudinary(image, "food_items");
    if (uploaded) {
      imageArray.push(uploaded);
    }
  }

  if (imageArray.length === 0) {
    imageArray.push({
      public_id: "default_food",
      url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80",
    });
  }

  const validSpiceLevels = ["Mild", "Medium", "Spicy", "Extra Spicy"];
  const finalSpice = validSpiceLevels.includes(spiceLevel) ? spiceLevel : "Medium";

  const foodItem = await FoodItem.create({
    name: name.trim(),
    price: numPrice,
    description: description.trim(),
    category: (category && category.trim()) || "Main Course",
    spiceLevel: finalSpice,
    isVeg: isVeg === true || isVeg === "true",
    isAvailable: isAvailable !== false && isAvailable !== "false",
    stock: stock !== undefined ? Math.max(0, Number(stock)) : 100,
    restaurant: restaurant._id,
    menu: menu._id,
    image: imageArray,
  });

  res.status(201).json({
    success: true,
    message: "Food item created successfully",
    foodItem,
  });
});

/**
 * Update an existing food item
 */
exports.updateOwnerFoodItem = catchAsyncErrors(async (req, res, next) => {
  const { foodId } = req.params;

  const foodItem = await FoodItem.findById(foodId);
  if (!foodItem) {
    return next(new ErrorHandler("Food item not found", 404));
  }

  // Verify ownership of the restaurant this food item belongs to
  await verifyRestaurantOwnership(foodItem.restaurant, req.user);

  const {
    name,
    price,
    description,
    category,
    spiceLevel,
    isVeg,
    isAvailable,
    stock,
    image,
  } = req.body;

  if (name !== undefined) {
    if (!name.trim()) return next(new ErrorHandler("Name cannot be empty", 400));
    foodItem.name = name.trim();
  }

  if (price !== undefined) {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return next(new ErrorHandler("Valid price is required", 400));
    }
    foodItem.price = numPrice;
  }

  if (description !== undefined) {
    if (!description.trim()) return next(new ErrorHandler("Description cannot be empty", 400));
    foodItem.description = description.trim();
  }

  if (category !== undefined) foodItem.category = category.trim();

  if (spiceLevel !== undefined) {
    const validSpiceLevels = ["Mild", "Medium", "Spicy", "Extra Spicy"];
    if (validSpiceLevels.includes(spiceLevel)) {
      foodItem.spiceLevel = spiceLevel;
    }
  }

  if (isVeg !== undefined) foodItem.isVeg = isVeg === true || isVeg === "true";
  if (isAvailable !== undefined) foodItem.isAvailable = isAvailable === true || isAvailable === "true";
  if (stock !== undefined) foodItem.stock = Math.max(0, Number(stock));

  // Handle image update
  if (image && typeof image === "string" && image.startsWith("data:image/")) {
    const uploaded = await uploadToCloudinary(image, "food_items");
    if (uploaded) {
      foodItem.image = [uploaded];
    }
  }

  await foodItem.save();

  res.status(200).json({
    success: true,
    message: "Food item updated successfully",
    foodItem,
  });
});

/**
 * Delete a food item
 */
exports.deleteOwnerFoodItem = catchAsyncErrors(async (req, res, next) => {
  const { foodId } = req.params;

  const foodItem = await FoodItem.findById(foodId);
  if (!foodItem) {
    return next(new ErrorHandler("Food item not found", 404));
  }

  // Verify ownership
  await verifyRestaurantOwnership(foodItem.restaurant, req.user);

  await FoodItem.findByIdAndDelete(foodId);

  res.status(200).json({
    success: true,
    message: "Food item deleted successfully",
  });
});

// =========================================================================
// STEP 5: OWNER ORDER MANAGEMENT
// =========================================================================

/**
 * Get all orders belonging to the authenticated owner's restaurants
 */
exports.getOwnerOrders = catchAsyncErrors(async (req, res, next) => {
  const { restaurantId, status } = req.query;

  let restaurantIds = [];

  if (restaurantId) {
    await verifyRestaurantOwnership(restaurantId, req.user);
    restaurantIds = [new mongoose.Types.ObjectId(restaurantId)];
  } else {
    const filter = req.user.role === "admin" ? {} : { owner: req.user._id };
    const myRestaurants = await Restaurant.find(filter).select("_id");
    restaurantIds = myRestaurants.map((r) => r._id);
  }

  if (restaurantIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      orders: [],
    });
  }

  const query = { restaurant: { $in: restaurantIds } };

  if (status && status !== "All") {
    query.orderStatus = status;
  }

  const orders = await Order.find(query)
    .populate("user", "name email phoneNumber")
    .populate("restaurant", "name address")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

/**
 * Update order status by restaurant owner with strict transition validation
 */
exports.updateOwnerOrderStatus = catchAsyncErrors(async (req, res, next) => {
  const { orderId } = req.params;
  const { newStatus, reason } = req.body;

  if (!newStatus) {
    return next(new ErrorHandler("Please provide new order status", 400));
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Strict ownership check: Must be owner of the order's restaurant
  await verifyRestaurantOwnership(order.restaurant, req.user);

  const currentStatus = order.orderStatus;

  // RULE: Owner CANNOT mark as 'Delivered'
  if (newStatus === "Delivered" && req.user.role !== "admin") {
    return next(
      new ErrorHandler(
        "Restaurant owners cannot mark orders as Delivered. That responsibility is reserved for delivery partners or administrators.",
        403
      )
    );
  }

  // Valid status transitions for restaurant owners:
  // "Order Confirmed" -> "Preparing" (Accept) OR "Rejected" / "Cancelled" (Reject with reason)
  // "Preparing" -> "Ready for Pickup" (Prepared) OR "Cancelled" (with reason)
  // "Ready for Pickup" -> Awaiting delivery partner dispatch

  const validOwnerStatuses = [
    "Preparing",
    "Ready for Pickup",
    "Cancelled",
    "Rejected",
  ];

  if (!validOwnerStatuses.includes(newStatus) && req.user.role !== "admin") {
    return next(
      new ErrorHandler(
        `Invalid status transition '${newStatus}'. Allowed: Preparing, Ready for Pickup, Cancelled, Rejected`,
        400
      )
    );
  }

  // Check from current status:
  if (currentStatus === "Delivered") {
    return next(new ErrorHandler("Delivered orders cannot be modified", 400));
  }

  if (currentStatus === "Cancelled" || currentStatus === "Rejected") {
    return next(new ErrorHandler("Cancelled orders cannot be modified", 400));
  }

  if (currentStatus === "Out for Delivery" && req.user.role !== "admin") {
    return next(
      new ErrorHandler(
        "Order is already out for delivery and cannot be modified by the restaurant",
        400
      )
    );
  }

  // If Rejecting or Cancelling, require a reason and restore stock
  if (newStatus === "Cancelled" || newStatus === "Rejected") {
    if (!reason || !reason.trim()) {
      return next(
        new ErrorHandler(
          "A cancellation / rejection reason is required",
          400
        )
      );
    }

    order.orderStatus = newStatus;
    order.cancelReason = reason.trim();
    order.cancelledAt = Date.now();

    // Restore stock for food items
    if (Array.isArray(order.orderItems)) {
      for (const item of order.orderItems) {
        if (item.fooditem) {
          await FoodItem.findByIdAndUpdate(item.fooditem, {
            $inc: { stock: item.quantity || 1 },
          });
        }
      }
    }
  } else {
    // Advancing state (e.g. to "Preparing" or "Ready for Pickup")
    order.orderStatus = newStatus;
  }

  await order.save();

  // Emit real-time lifecycle event
  let eventName = "order:status_updated";
  if (order.orderStatus === "Preparing") eventName = "order:preparing";
  else if (order.orderStatus === "Ready for Pickup") eventName = "order:ready_for_pickup";
  else if (order.orderStatus === "Cancelled") eventName = "order:cancelled";
  else if (order.orderStatus === "Rejected") eventName = "order:rejected";

  await emitOrderLifecycleEvent(eventName, order, { reason: order.cancelReason });

  res.status(200).json({
    success: true,
    message: `Order status updated to '${order.orderStatus}'`,
    order,
  });
});

