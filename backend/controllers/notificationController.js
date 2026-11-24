const mongoose = require("mongoose");
const Notification = require("../models/notification");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

/**
 * Get all notifications for the authenticated user (paginated)
 */
exports.getMyNotifications = catchAsyncErrors(async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 15));
  const skip = (page - 1) * limit;

  if (mongoose.connection.readyState !== 1) {
    return res.status(200).json({
      success: true,
      count: 0,
      totalCount: 0,
      unreadCount: 0,
      totalPages: 0,
      currentPage: page,
      notifications: [],
    });
  }

  const totalCount = await Notification.countDocuments({ user: req.user._id });
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  const notifications = await Notification.find({ user: req.user._id })
    .populate("order", "orderStatus finalTotal restaurant")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: notifications.length,
    totalCount,
    unreadCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    notifications,
  });
});

/**
 * Get unread notification count for the authenticated user
 */
exports.getUnreadCount = catchAsyncErrors(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(200).json({
      success: true,
      count: 0,
    });
  }

  const count = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    count,
  });
});

/**
 * Mark a single notification as read (Strict user ownership)
 */
exports.markAsRead = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid notification ID", 400));
  }

  const notification = await Notification.findById(id);
  if (!notification) {
    return next(new ErrorHandler("Notification not found", 404));
  }

  // Strict ownership check
  if (notification.user.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandler("You are not authorized to access this notification", 403)
    );
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
    notification,
  });
});

/**
 * Mark all notifications as read for authenticated user
 */
exports.markAllAsRead = catchAsyncErrors(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});

/**
 * Delete a notification (Strict user ownership)
 */
exports.deleteNotification = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid notification ID", 400));
  }

  const notification = await Notification.findById(id);
  if (!notification) {
    return next(new ErrorHandler("Notification not found", 404));
  }

  // Strict ownership check
  if (notification.user.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandler("You are not authorized to delete this notification", 403)
    );
  }

  await Notification.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Notification deleted successfully",
  });
});

