const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({

    name: {
        type: String,
        required: [true, "Please enter restaurant name"],
        trim: true,
        maxlength: [100, "Restaurant name cannot exceed 100 characters"]
    },

    isVeg: {
        type: Boolean,
        default: false
    },

    address: {
        type: String,
        required: [true, "Please enter restaurant address"],
        trim: true
    },

    ratings: {
        type: Number,
        default: 0
    },

    numOfReviews: {
        type: Number,
        default: 0
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },

    description: {
        type: String,
        trim: true,
        default: ""
    },

    phoneNumber: {
        type: String,
        trim: true,
        default: ""
    },

    openingTime: {
        type: String,
        default: "09:00"
    },

    closingTime: {
        type: String,
        default: "23:00"
    },

    isOpen: {
        type: Boolean,
        default: true
    },

    deliveryTime: {
        type: Number,
        default: 30
    },

    deliveryRadius: {
        type: Number,
        default: 10
    },

    location: {
        type: {
            type: String,
            enum: ["Point"],
            required: true,
            default: "Point"
        },

        coordinates: {
            type: [Number],
            required: true,
            default: [73.8567, 18.5204]
        }
    },

    reviews: [
        {
            name: {
                type: String,
                required: true
            },

            rating: {
                type: Number,
                required: true,
                min: 1,
                max: 5
            },

            comment: {
                type: String,
                required: true
            }
        }
    ],

    images: [
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

    createdAt: {
        type: Date,
        default: Date.now
    }

});

restaurantSchema.index({ location: "2dsphere" });

restaurantSchema.index({ address: "text" });

module.exports = mongoose.model("Restaurant", restaurantSchema);