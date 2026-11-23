const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const APIFeatures = require("../utils/apiFeatures");
const Restaurant = require("../models/restaurant");
const Menu = require("../models/menu");
const FoodItem = require("../models/fooditem");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// Helper to load offline restaurants from restaurants.json
function getFallbackRestaurants(query = {}) {
  try {
    const filePath = path.join(__dirname, "../restaurants.json");
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    let list = data.restaurant || [];

    // Filter by keyword if provided
    if (query.keyword) {
      const kw = query.keyword.trim().toLowerCase();
      list = list.filter((r) => {
        const nameMatch = r.name && r.name.toLowerCase().includes(kw);
        const cuisineMatch = r.cuisines && r.cuisines.toLowerCase().includes(kw);
        const addressMatch = r.address && r.address.toLowerCase().includes(kw);
        const tagsMatch = Array.isArray(r.tags) && r.tags.some((t) => t.toLowerCase().includes(kw));
        return nameMatch || cuisineMatch || addressMatch || tagsMatch;
      });
    }

    // Filter by isVeg if provided
    if (query.isVeg !== undefined) {
      const isVeg = query.isVeg === "true" || query.isVeg === true;
      list = list.filter((r) => r.isVeg === isVeg);
    }

    // Sorting
    if (query.sortBy) {
      const sortBy = query.sortBy.toLowerCase();
      if (sortBy === "ratings") {
        list.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
      } else if (sortBy === "reviews") {
        list.sort((a, b) => (b.numOfReviews || 0) - (a.numOfReviews || 0));
      }
    }

    return list;
  } catch (e) {
    console.error("Error reading restaurants.json fallback:", e);
    return [];
  }
}

// Helper to load fallback menus from sampleMenus.json
function getFallbackMenus(restaurantId) {
  try {
    const filePath = path.join(__dirname, "../sampleMenus.json");
    if (fs.existsSync(filePath)) {
      const allMenus = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (allMenus[restaurantId]) {
        return allMenus[restaurantId];
      }
    }
  } catch (e) {
    console.error("Error reading sampleMenus.json:", e);
  }
  return [];
}

// GET ALL RESTAURANTS
exports.getAllRestaurants = catchAsyncErrors(async (req, res, next) => {
  // If database is connected, try database first
  if (mongoose.connection.readyState === 1) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const apiFeatures = new APIFeatures(Restaurant.find(), req.query)
        .search()
        .filter()
        .sort()
        .pagination(limit);
      const restaurants = await apiFeatures.query;
      if (restaurants && restaurants.length > 0) {
        return res.status(200).json({
          success: true,
          count: restaurants.length,
          restaurant: restaurants,
        });
      }
    } catch (dbErr) {
      console.warn("DB query failed, using local restaurants:", dbErr.message);
    }
  }

  // Fallback to local restaurant dataset
  const restaurants = getFallbackRestaurants(req.query);
  res.status(200).json({
    success: true,
    count: restaurants.length,
    restaurant: restaurants,
  });
});

// GET RESTAURANT BY ID
exports.getRestaurantById = catchAsyncErrors(async (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const restaurant = await Restaurant.findById(req.params.id);
      if (restaurant) {
        return res.status(200).json({
          success: true,
          data: restaurant,
        });
      }
    } catch (dbErr) {
      console.warn("DB query failed, using local restaurant:", dbErr.message);
    }
  }

  // Fallback
  const list = getFallbackRestaurants();
  const restaurant = list.find((r) => r._id === req.params.id);
  if (!restaurant) {
    return next(new ErrorHandler("Restaurant not found", 404));
  }

  res.status(200).json({
    success: true,
    data: restaurant,
  });
});

// GET MENUS FOR A RESTAURANT
exports.getMenus = catchAsyncErrors(async (req, res, next) => {
  try {
    const restaurantId = req.params.id;

    if (mongoose.connection.readyState === 1) {
      try {
        const menus = await Menu.find({ restaurant: restaurantId });
        if (menus && menus.length > 0) {
          const data = await Promise.all(
            menus.map(async (menu) => {
              const foodItems = await FoodItem.find({ menu: menu._id });
              return {
                ...menu.toObject(),
                foodItems,
              };
            })
          );
          return res.status(200).json({
            success: true,
            data,
          });
        }
      } catch (dbErr) {
        console.warn("DB menus query failed, using fallback:", dbErr.message);
      }
    }

    // Fallback
    const fallbackData = getFallbackMenus(restaurantId);
    res.status(200).json({
      success: true,
      data: fallbackData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
