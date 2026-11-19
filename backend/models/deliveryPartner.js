const mongoose = require("mongoose");

const deliveryPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ["Bicycle", "Bike / Motorcycle", "Electric Scooter", "Car", "Van"],
      default: "Bike / Motorcycle",
    },
    vehicleNumber: {
      type: String,
      required: [true, "Vehicle number is required"],
      trim: true,
      uppercase: true,
    },
    drivingLicense: {
      type: String,
      trim: true,
    },
    availabilityStatus: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "offline",
      index: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [73.8567, 18.5204], // Pune default
      },
      latitude: {
        type: Number,
        default: 18.5204,
      },
      longitude: {
        type: Number,
        default: 73.8567,
      },
      heading: {
        type: Number,
        default: 0,
      },
      speed: {
        type: Number,
        default: 0,
      },
      address: {
        type: String,
        default: "",
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    lastLocationUpdate: {
      type: Date,
    },
    activeOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    assignedOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    totalCompletedDeliveries: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.9,
      min: 1,
      max: 5,
    },
    earnings: {
      totalEarnings: {
        type: Number,
        default: 0,
      },
      pendingPayout: {
        type: Number,
        default: 0,
      },
      completedPayout: {
        type: Number,
        default: 0,
      },
      history: [
        {
          order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
          },
          amount: {
            type: Number,
            required: true,
          },
          deliveryFee: {
            type: Number,
            default: 0,
          },
          tip: {
            type: Number,
            default: 0,
          },
          date: {
            type: Date,
            default: Date.now,
          },
          status: {
            type: String,
            enum: ["credited", "paid_out"],
            default: "credited",
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for location queries
deliveryPartnerSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("DeliveryPartner", deliveryPartnerSchema);

