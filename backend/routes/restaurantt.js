const express = require("express");
const router = express.Router();
const {
    getAllRestaurants,
    getRestaurantById,
    getMenus,
} = require("../controllers/restaurantController");

router.route("/").get(getAllRestaurants);
router.route("/:id").get(getRestaurantById);
router.route("/:id/menus").get(getMenus);
module.exports = router;
