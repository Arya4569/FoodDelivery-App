const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    price: {
        type: Number,
        required: true,
        default: 0
    },

    description: {
        type: String,
        required: true
    },

    isVeg: {
        type: Boolean,
        default: true
    },

    category: {
        type: String,
        trim: true,
        default: "Main Course"
    },

    spiceLevel: {
        type: String,
        enum: ["Mild", "Medium", "Spicy", "Extra Spicy"],
        default: "Medium"
    },

    isAvailable: {
        type: Boolean,
        default: true
    },

    ratings: {
        type: Number,
        default: 0
    },

    image: [
        {
            public_id: {
                type: String,
                required: true
            },

            url: {
                type: String,
                required: true
            }
        }
    ],

    menu: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Menu",
        required: true
    },

    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true
    },

    stock: {
        type: Number,
        default: 100
    },

    numberOfReviews: {
        type: Number,
        default: 0
    },

    reviews: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },

            name: String,

            rating: Number,

            comment: String,

            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ],

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports =
    mongoose.models.FoodItem ||
    mongoose.model("FoodItem", foodItemSchema);