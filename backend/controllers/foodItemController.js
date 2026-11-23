const Fooditem = require("../models/foodItem");
const Order = require("../models/order");
const ErrorHandler = require("../utils/errorHandler");
const catchAsync = require("../middlewares/catchAsyncErrors");
const APIFeatures = require("../utils/apiFeatures");
const mongoose = require("mongoose");

// Search Food Items with Filters & Pagination
exports.searchFoodItems = catchAsync(async (req, res, next) => {
  const {
    keyword,
    category,
    isVeg,
    minPrice,
    maxPrice,
    minRating,
    sortBy,
    page = 1,
    limit = 12,
    restaurantId,
  } = req.query;

  const query = {};

  // Keyword search on name or description or category
  if (keyword && keyword.trim() !== "") {
    const regex = new RegExp(keyword.trim(), "i");
    query.$or = [{ name: regex }, { description: regex }, { category: regex }];
  }

  // Category filter
  if (category && category !== "All") {
    query.category = new RegExp(category.trim(), "i");
  }

  // Veg / Non-Veg filter
  if (isVeg !== undefined && isVeg !== "") {
    query.isVeg = isVeg === "true" || isVeg === true;
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Rating filter
  if (minRating) {
    query.ratings = { $gte: Number(minRating) };
  }

  // Restaurant filter
  if (restaurantId) {
    query.restaurant = restaurantId;
  }

  // Sorting
  let sortOption = { createdAt: -1 };
  if (sortBy === "price_asc") sortOption = { price: 1 };
  else if (sortBy === "price_desc") sortOption = { price: -1 };
  else if (sortBy === "rating_desc") sortOption = { ratings: -1 };
  else if (sortBy === "name_asc") sortOption = { name: 1 };

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  if (mongoose.connection.readyState === 1) {
    try {
      const totalCount = await Fooditem.countDocuments(query);
      const foodItems = await Fooditem.find(query)
        .populate("restaurant", "name address location ratings images isVeg")
        .populate("menu", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        count: foodItems.length,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        foodItems,
      });
    } catch (e) {
      console.warn("DB query failed in searchFoodItems, using local dataset:", e.message);
    }
  }

  // Fallback to local dataset from sampleMenus.json
  try {
    const sampleMenus = require("../sampleMenus.json");
    const restaurantsData = require("../restaurants.json").restaurant;
    let allItems = [];
    Object.keys(sampleMenus).forEach((rId) => {
      const r = restaurantsData.find((item) => item._id === rId);
      (sampleMenus[rId] || []).forEach((menu) => {
        (menu.foodItems || []).forEach((food) => {
          allItems.push({
            ...food,
            restaurant: r || { _id: rId, name: "Restaurant" },
            menu: { _id: menu._id, name: menu.name },
          });
        });
      });
    });

    if (keyword && keyword.trim()) {
      const kw = keyword.toLowerCase().trim();
      allItems = allItems.filter(
        (f) =>
          (f.name && f.name.toLowerCase().includes(kw)) ||
          (f.description && f.description.toLowerCase().includes(kw))
      );
    }
    if (category && category !== "All") {
      const cat = category.toLowerCase().trim();
      allItems = allItems.filter(
        (f) =>
          (f.menu?.name && f.menu.name.toLowerCase().includes(cat)) ||
          (f.name && f.name.toLowerCase().includes(cat))
      );
    }
    if (isVeg !== undefined && isVeg !== "") {
      const isV = isVeg === "true" || isVeg === true;
      allItems = allItems.filter((f) => f.isVeg === isV);
    }
    if (minPrice) allItems = allItems.filter((f) => f.price >= Number(minPrice));
    if (maxPrice) allItems = allItems.filter((f) => f.price <= Number(maxPrice));
    if (minRating) allItems = allItems.filter((f) => (f.ratings || 0) >= Number(minRating));
    if (restaurantId) allItems = allItems.filter((f) => f.restaurant?._id === restaurantId);

    if (sortBy === "price_asc") allItems.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") allItems.sort((a, b) => b.price - a.price);
    else if (sortBy === "rating_desc") allItems.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));

    const totalCount = allItems.length;
    const pagedItems = allItems.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      count: pagedItems.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      foodItems: pagedItems,
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      count: 0,
      totalCount: 0,
      totalPages: 0,
      currentPage: pageNum,
      foodItems: [],
    });
  }
});

// Add Review to Food Item
exports.addFoodReview = catchAsync(async (req, res, next) => {
  const { foodId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return next(new ErrorHandler("Please provide rating and review comment", 400));
  }

  const numRating = Number(rating);
  if (numRating < 1 || numRating > 5) {
    return next(new ErrorHandler("Rating must be between 1 and 5", 400));
  }

  const foodItem = await Fooditem.findById(foodId);
  if (!foodItem) {
    return next(new ErrorHandler("Food item not found", 404));
  }

  // Verify eligibility: Customer must have purchased this food item
  const hasPurchased = await Order.findOne({
    user: req.user._id,
    "orderItems.fooditem": foodId,
  });

  if (!hasPurchased && req.user.role !== "admin") {
    return next(
      new ErrorHandler("You can only review food items you have previously ordered", 403)
    );
  }

  if (!foodItem.reviews) foodItem.reviews = [];

  const existingReviewIndex = foodItem.reviews.findIndex(
    (r) => r.user && r.user.toString() === req.user._id.toString()
  );

  if (existingReviewIndex > -1) {
    foodItem.reviews[existingReviewIndex].rating = numRating;
    foodItem.reviews[existingReviewIndex].comment = comment;
    foodItem.reviews[existingReviewIndex].name = req.user.name;
    foodItem.reviews[existingReviewIndex].createdAt = Date.now();
  } else {
    foodItem.reviews.push({
      user: req.user._id,
      name: req.user.name,
      rating: numRating,
      comment,
      createdAt: Date.now(),
    });
  }

  foodItem.numberOfReviews = foodItem.reviews.length;
  const total = foodItem.reviews.reduce((sum, r) => sum + r.rating, 0);
  foodItem.ratings = Number((total / foodItem.reviews.length).toFixed(1));

  await foodItem.save();

  res.status(200).json({
    success: true,
    message: "Review submitted successfully",
    foodItem,
  });
});

// Get Reviews for a Food Item
exports.getFoodReviews = catchAsync(async (req, res, next) => {
  const { foodId } = req.params;
  const foodItem = await Fooditem.findById(foodId).select(
    "name ratings numberOfReviews reviews"
  );

  if (!foodItem) {
    return next(new ErrorHandler("Food item not found", 404));
  }

  res.status(200).json({
    success: true,
    ratings: foodItem.ratings || 0,
    numberOfReviews: foodItem.numberOfReviews || 0,
    reviews: foodItem.reviews || [],
  });
});

exports.getAllFoodItems = catchAsync(async (req, res, next) => {
  let restaurantId = {};
  if (req.params.storeId) {
    restaurantId = { restaurant: req.params.storeId };
  }

  const foodItems = await Fooditem.find(restaurantId).populate("restaurant");
  res.status(200).json({
    status: "success",
    results: foodItems.length,
    data: foodItems,
  });
});

// /v1/eats/stores/{store_id}/menus
exports.createFoodItem = catchAsync(async (req, res, next) => {
  // handle optional imageUrl input by converting to images array
  const body = { ...req.body };
  if (body.imageUrl) {
    body.images = [
      {
        public_id: "default",
        url: body.imageUrl,
      },
    ];
    delete body.imageUrl;
  }

  const fooditem = await Fooditem.create(body);
  res.status(201).json({
    status: "success",
    data: fooditem,
  });
});

exports.getFoodItem = catchAsync(async (req, res, next) => {
  const foodItem = await Fooditem.findById(req.params.foodId);

  if (!foodItem)
    return next(new ErrorHandler("No foodItem found with that ID", 404));

  res.status(200).json({
    status: "success",
    data: foodItem,
  });
});

exports.updateFoodItem = catchAsync(async (req, res, next) => {
  const foodItem = await Fooditem.findByIdAndUpdate(
    req.params.foodId,
    req.body,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!foodItem)
    return next(new ErrorHandler("No document found with that ID", 404));

  res.status(200).json({
    status: "success",
    data: foodItem,
  });
});

exports.deleteFoodItem = catchAsync(async (req, res, next) => {
  const foodItem = await Fooditem.findByIdAndDelete(req.params.foodId);

  if (!foodItem)
    return next(new ErrorHandler("No document found with that ID", 404));

  res.status(204).json({
    status: "success",
  });
});
