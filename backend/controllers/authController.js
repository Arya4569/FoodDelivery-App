const User = require("../models/user");
const jwt = require("jsonwebtoken");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const sendToken = require("../utils/sendToken");
const cloudinary = require("../config/cloudinary");


// ================= REGISTER =================

exports.signUp = catchAsyncErrors(async (req, res, next) => {

    const {
        name,
        email,
        password,
        confirmPassword,
        phoneNumber
    } = req.body;

    let avatar = {};

    if (!req.body.avatar || req.body.avatar === "/images/images.png") {
        avatar = {
            public_id: "default",
            url: "/images/images.png"
        };
    } else {
        try {
            const result = await cloudinary.uploader.upload(req.body.avatar, {
                folder: "avatars",
                width: 150,
                crop: "scale"
            });

            avatar = {
                public_id: result.public_id,
                url: result.secure_url
            };
        } catch (uploadError) {
            console.warn("Cloudinary upload failed (using default avatar fallback):", uploadError.message);
            avatar = {
                public_id: "default",
                url: "/images/images.png"
            };
        }
    }

    const user = await User.create({
        name,
        email,
        password,
        confirmPassword,
        phoneNumber,
        avatar
    });

    sendToken(user, 200, res);

});



// ================= LOGIN =================

exports.login = catchAsyncErrors(async (req, res, next) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Please enter email and password"
        });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    const isPasswordMatched = await user.correctPassword(
        password,
        user.password
    );

    if (!isPasswordMatched) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    sendToken(user, 200, res);

});



// ================= LOGOUT =================

exports.logout = catchAsyncErrors(async (req, res, next) => {

    res.cookie("jwt", null, {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: "Logged Out Successfully"
    });

});



// ================= PROTECT ROUTE =================

exports.protect = catchAsyncErrors(async (req, res, next) => {

    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(
            new ErrorHandler("Please login to access this resource", 401)
        );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id)
        .populate('favoriteRestaurants')
        .populate({
            path: 'favoriteFoodItems',
            populate: { path: 'restaurant', select: 'name' }
        });

    if (!req.user) {
        return next(
            new ErrorHandler("User not found or session has expired", 401)
        );
    }

    next();

});



// ================= GET LOGGED IN USER =================

exports.getMe = catchAsyncErrors(async (req, res, next) => {

    res.status(200).json({
        success: true,
        data: {
            user: req.user
        }
    });

});



// ================= TOGGLE FAVOURITE RESTAURANT =================

exports.toggleFavouriteRestaurant = catchAsyncErrors(async (req, res, next) => {
    const restaurantId = req.params.id;
    const user = await User.findById(req.user.id);

    const index = user.favoriteRestaurants.indexOf(restaurantId);
    if (index > -1) {
        user.favoriteRestaurants.splice(index, 1);
    } else {
        user.favoriteRestaurants.push(restaurantId);
    }

    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(user._id)
        .populate('favoriteRestaurants')
        .populate({
            path: 'favoriteFoodItems',
            populate: { path: 'restaurant', select: 'name' }
        });

    res.status(200).json({
        success: true,
        message: index > -1 ? "Removed from favourite restaurants" : "Added to favourite restaurants",
        user: updatedUser
    });
});



// ================= TOGGLE FAVOURITE FOOD ITEM =================

exports.toggleFavouriteFoodItem = catchAsyncErrors(async (req, res, next) => {
    const foodItemId = req.params.id;
    const user = await User.findById(req.user.id);

    if (!user.favoriteFoodItems) {
        user.favoriteFoodItems = [];
    }

    const index = user.favoriteFoodItems.indexOf(foodItemId);
    if (index > -1) {
        user.favoriteFoodItems.splice(index, 1);
    } else {
        user.favoriteFoodItems.push(foodItemId);
    }

    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(user._id)
        .populate('favoriteRestaurants')
        .populate({
            path: 'favoriteFoodItems',
            populate: { path: 'restaurant', select: 'name' }
        });

    res.status(200).json({
        success: true,
        message: index > -1 ? "Removed from favourite food items" : "Added to favourite food items",
        user: updatedUser
    });
});



// ================= GET WISHLIST =================

exports.getWishlist = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id)
        .populate('favoriteRestaurants')
        .populate({
            path: 'favoriteFoodItems',
            populate: { path: 'restaurant', select: 'name' }
        });

    res.status(200).json({
        success: true,
        wishlist: {
            restaurants: user.favoriteRestaurants || [],
            foodItems: user.favoriteFoodItems || []
        }
    });
});



// ================= UPDATE ME =================

exports.updateMe = catchAsyncErrors(async (req, res, next) => {
  const allowedFields = ['name', 'phoneNumber'];
  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });
  if (req.body.avatar && req.body.avatar !== '/images/images.png') {
    try {
      const result = await cloudinary.uploader.upload(req.body.avatar, {
        folder: 'avatars', width: 150, crop: 'scale'
      });
      updates.avatar = { public_id: result.public_id, url: result.secure_url };
    } catch (err) {
      console.error('Avatar upload failed:', err.message);
    }
  }
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true, runValidators: true
  });
  res.status(200).json({ success: true, data: { user } });
});



// ================= CHANGE PASSWORD =================

exports.changePassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmNewPassword)
    return next(new ErrorHandler('Please provide all password fields', 400));
  if (newPassword !== confirmNewPassword)
    return next(new ErrorHandler('New passwords do not match', 400));
  if (newPassword.length < 6)
    return next(new ErrorHandler('Password must be at least 6 characters', 400));
  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.correctPassword(currentPassword, user.password);
  if (!isMatch) return next(new ErrorHandler('Current password is incorrect', 401));
  user.password = newPassword;
  user.confirmPassword = newPassword;
  await user.save();
  sendToken(user, 200, res);
});



// ================= ADDRESS MANAGEMENT =================

exports.getAddresses = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({
    success: true,
    addresses: user.addresses || []
  });
});

exports.addAddress = catchAsyncErrors(async (req, res, next) => {
  const { label, addressLine, city, state, postalCode, country, phoneNumber, isDefault } = req.body;
  if (!addressLine || !city || !postalCode) {
    return next(new ErrorHandler("Address line, city and postal code are required", 400));
  }
  const user = await User.findById(req.user._id);
  if (!user.addresses) user.addresses = [];

  if (isDefault) {
    user.addresses.forEach(a => a.isDefault = false);
  }

  const newAddr = {
    label: label || "Home",
    addressLine,
    city,
    state: state || "Maharashtra",
    postalCode,
    country: country || "IN",
    phoneNumber: phoneNumber || user.phoneNumber || "",
    isDefault: isDefault || (user.addresses.length === 0)
  };

  user.addresses.push(newAddr);
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    message: "Address added successfully",
    addresses: user.addresses
  });
});

exports.deleteAddress = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user.addresses) {
    return next(new ErrorHandler("Address not found", 404));
  }
  user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.addressId);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Address deleted successfully",
    addresses: user.addresses
  });
});

exports.setDefaultAddress = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  let found = false;
  user.addresses.forEach(a => {
    if (a._id.toString() === req.params.addressId) {
      a.isDefault = true;
      found = true;
    } else {
      a.isDefault = false;
    }
  });

  if (!found) return next(new ErrorHandler("Address not found", 404));

  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
    message: "Default address updated",
    addresses: user.addresses
  });
});
