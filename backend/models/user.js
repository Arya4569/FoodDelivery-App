const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: [true, "Please enter your name"],
        trim: true
    },

    email: {
        type: String,
        required: [true, "Please enter your email"],
        unique: true,
        validate: [validator.isEmail, "Please enter a valid email"]
    },

    phoneNumber: {
        type: String,
        required: [true, "Please enter your phone number"]
    },

    password: {
        type: String,
        required: [true, "Please enter your password"],
        minlength: 6,
        select: false
    },

    confirmPassword: {
        type: String,
        required: [true, "Please confirm your password"],
        validate: {
            // Only works on CREATE and SAVE
            validator: function(el) {
                return el === this.password;
            },
            message: "Passwords do not match"
        }
    },

    avatar: {
        public_id: {
            type: String,
            default: "default_avatar"
        },
        url: {
            type: String,
            default: "/images/images.png"
        }
    },

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    // New fields for dashboard
    role: {
        type: String,
        enum: ['user', 'admin', 'restaurant_owner', 'owner', 'delivery_partner'],
        default: 'user'
    },
    addresses: [
        {
            label: {
                type: String,
                default: "Home"
            },
            addressLine: {
                type: String,
                required: true
            },
            city: {
                type: String,
                required: true
            },
            state: {
                type: String,
                default: "Maharashtra"
            },
            postalCode: {
                type: String,
                required: true
            },
            country: {
                type: String,
                default: "IN"
            },
            phoneNumber: {
                type: String
            },
            isDefault: {
                type: Boolean,
                default: false
            }
        }
    ],
    favoriteRestaurants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant'
        }
    ],
    favoriteFoodItems: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodItem'
        }
    ],
    preferences: {
        veg: { type: Boolean, default: false },
        nonVeg: { type: Boolean, default: false },
        spicy: { type: Boolean, default: false },
        healthy: { type: Boolean, default: false }
    }
},
{
    timestamps: true
}
);

// Hash password before saving
userSchema.pre("save", async function() {
    if (!this.isModified("password")) return ;

    this.password = await bcrypt.hash(this.password, 12);
    this.confirmPassword = undefined;

   
});

// Compare passwords
userSchema.methods.correctPassword = async function(
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Check password change after JWT issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );

        return JWTTimestamp < changedTimestamp;
    }

    return false;
};

// Generate JWT
userSchema.methods.getJWTToken = function() {
    return jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE
        }
    );
};

module.exports = mongoose.model("User", userSchema);