const mongoose = require("mongoose");
const DeliveryPartner = require("../models/deliveryPartner");
const Order = require("../models/order");
const User = require("../models/user");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const { emitOrderLifecycleEvent, notifyUser, getIO } = require("../socket/socketHandler");

// =========================================================================
// 1. REGISTRATION & PROFILE MANAGEMENT
// =========================================================================

/**
 * Register as a delivery partner (requires authenticated user)
 * POST /api/v1/delivery/register
 */
exports.registerDeliveryPartner = catchAsyncErrors(async (req, res, next) => {
  const { phone, vehicleType, vehicleNumber, drivingLicense } = req.body;

  if (!phone || !vehicleNumber) {
    return next(new ErrorHandler("Phone number and vehicle number are required", 400));
  }

  // Check if partner profile already exists for this user
  const existingPartner = await DeliveryPartner.findOne({ user: req.user._id });
  if (existingPartner) {
    return res.status(200).json({
      success: true,
      message: "Delivery partner profile already exists",
      deliveryPartner: existingPartner,
    });
  }

  const partner = await DeliveryPartner.create({
    user: req.user._id,
    phone: phone.trim(),
    vehicleType: vehicleType || "Bike / Motorcycle",
    vehicleNumber: vehicleNumber.trim().toUpperCase(),
    drivingLicense: drivingLicense ? drivingLicense.trim() : "",
    availabilityStatus: "offline",
    isOnline: false,
    verificationStatus: "pending",
  });

  // Notify user that application is received
  await notifyUser({
    userId: req.user._id,
    type: "system",
    title: "Delivery Partner Application Submitted 📋",
    message: "Your application is under review. Admin will verify your documents shortly.",
  });

  res.status(201).json({
    success: true,
    message: "Delivery partner application submitted successfully. Awaiting admin approval.",
    deliveryPartner: partner,
  });
});

/**
 * Get current delivery partner profile
 * GET /api/v1/delivery/profile/me
 */
exports.getPartnerProfile = catchAsyncErrors(async (req, res, next) => {
  const partner = await DeliveryPartner.findOne({ user: req.user._id })
    .populate("user", "name email phoneNumber avatar")
    .populate({
      path: "activeOrder",
      populate: [
        { path: "restaurant", select: "name address phoneNumber location" },
        { path: "user", select: "name phoneNumber" },
      ],
    });

  if (!partner) {
    return next(new ErrorHandler("Delivery partner profile not found", 404));
  }

  res.status(200).json({
    success: true,
    deliveryPartner: partner,
  });
});

/**
 * Update delivery partner profile details
 * PUT /api/v1/delivery/profile/me
 */
exports.updatePartnerProfile = catchAsyncErrors(async (req, res, next) => {
  const { phone, vehicleType, vehicleNumber, drivingLicense } = req.body;

  const partner = await DeliveryPartner.findOne({ user: req.user._id });
  if (!partner) {
    return next(new ErrorHandler("Delivery partner profile not found", 404));
  }

  if (phone) partner.phone = phone.trim();
  if (vehicleType) partner.vehicleType = vehicleType;
  if (vehicleNumber) partner.vehicleNumber = vehicleNumber.trim().toUpperCase();
  if (drivingLicense !== undefined) partner.drivingLicense = drivingLicense.trim();

  await partner.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    deliveryPartner: partner,
  });
});

/**
 * Toggle online / offline availability
 * PUT /api/v1/delivery/availability
 */
exports.updateAvailability = catchAsyncErrors(async (req, res, next) => {
  const { isOnline } = req.body;

  if (isOnline === undefined) {
    return next(new ErrorHandler("Please provide isOnline status (true or false)", 400));
  }

  const partner = await DeliveryPartner.findOne({ user: req.user._id });
  if (!partner) {
    return next(new ErrorHandler("Delivery partner profile not found", 404));
  }

  if (partner.verificationStatus !== "approved") {
    return next(
      new ErrorHandler(
        `Cannot change availability: Account is ${partner.verificationStatus}. Only approved partners can go online.`,
        403
      )
    );
  }

  // Prevent going offline while an active delivery is in progress
  if (!isOnline && partner.activeOrder) {
    return next(
      new ErrorHandler("Cannot go offline while you have an active ongoing delivery", 400)
    );
  }

  partner.isOnline = Boolean(isOnline);
  partner.availabilityStatus = partner.isOnline
    ? partner.activeOrder
      ? "busy"
      : "available"
    : "offline";

  await partner.save();

  res.status(200).json({
    success: true,
    message: `You are now ${partner.isOnline ? "Online (Available for orders)" : "Offline"}`,
    isOnline: partner.isOnline,
    availabilityStatus: partner.availabilityStatus,
  });
});

// =========================================================================
// 2. ORDER ASSIGNMENT & DISCOVERY
// =========================================================================

/**
 * Get available orders eligible for delivery pickup
 * GET /api/v1/delivery/orders/available
 */
exports.getAvailableOrders = catchAsyncErrors(async (req, res, next) => {
  const partner = await DeliveryPartner.findOne({ user: req.user._id });
  if (!partner || partner.verificationStatus !== "approved") {
    return next(new ErrorHandler("Only verified delivery partners can view available orders", 403));
  }

  // Orders that are ready for pickup and have no assigned delivery partner
  const orders = await Order.find({
    orderStatus: { $in: ["Ready for Pickup", "Preparing"] },
    $or: [
      { assignedDeliveryPartner: { $exists: false } },
      { assignedDeliveryPartner: null },
    ],
  })
    .populate("restaurant", "name address phoneNumber")
    .select(
      "_id orderStatus finalTotal itemsPrice deliveryCharge createdAt estimatedDeliveryTime restaurant orderItems deliveryInfo.city deliveryInfo.postalCode"
    )
    .sort({ createdAt: -1 });

  // Map to exclude sensitive exact customer address lines from unassigned orders
  const sanitizedOrders = orders.map((ord) => ({
    _id: ord._id,
    orderStatus: ord.orderStatus,
    finalTotal: ord.finalTotal,
    deliveryCharge: ord.deliveryCharge || 50,
    itemsCount: ord.orderItems ? ord.orderItems.length : 0,
    restaurant: ord.restaurant,
    destinationArea: ord.deliveryInfo ? `${ord.deliveryInfo.city} (${ord.deliveryInfo.postalCode})` : "Local Area",
    createdAt: ord.createdAt,
    estimatedEarnings: (ord.deliveryCharge || 50) + 10,
  }));

  res.status(200).json({
    success: true,
    count: sanitizedOrders.length,
    orders: sanitizedOrders,
  });
});

/**
 * Get assigned deliveries for the authenticated delivery partner
 * GET /api/v1/delivery/orders/my-deliveries
 */
exports.getMyDeliveries = catchAsyncErrors(async (req, res, next) => {
  const partner = await DeliveryPartner.findOne({ user: req.user._id });
  if (!partner) {
    return next(new ErrorHandler("Delivery partner profile not found", 404));
  }

  const { status } = req.query; // 'active', 'completed', or specific status

  let query = { assignedDeliveryPartner: partner._id };

  if (status === "active") {
    query.orderStatus = { $in: ["Assigned", "Picked Up", "Out for Delivery"] };
  } else if (status === "completed") {
    query.orderStatus = "Delivered";
  } else if (status && status !== "all") {
    query.orderStatus = status;
  }

  const orders = await Order.find(query)
    .populate("restaurant", "name address phoneNumber")
    .populate("user", "name phoneNumber")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

/**
 * Get single delivery order details (strictly restricted to assigned partner or admin)
 * GET /api/v1/delivery/orders/:id
 */
exports.getSingleDeliveryOrder = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid order ID", 400));
  }

  const order = await Order.findById(id)
    .populate("restaurant", "name address phoneNumber")
    .populate("user", "name phoneNumber")
    .populate("assignedDeliveryPartner");

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  const partner = await DeliveryPartner.findOne({ user: req.user._id });

  // Authorization check: User must be admin OR the assigned delivery partner
  const isAssigned =
    partner &&
    order.assignedDeliveryPartner &&
    order.assignedDeliveryPartner._id.toString() === partner._id.toString();

  if (req.user.role !== "admin" && !isAssigned) {
    return next(
      new ErrorHandler("You are not authorized to access this delivery order", 403)
    );
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// =========================================================================
// 3. ADMIN MANAGEMENT & ASSIGNMENT
// =========================================================================

/**
 * Get all delivery partners (Admin only)
 * GET /api/v1/admin/delivery-partners
 */
exports.getAllDeliveryPartners = catchAsyncErrors(async (req, res, next) => {
  const { status, verification } = req.query;

  const filter = {};
  if (status) filter.availabilityStatus = status;
  if (verification) filter.verificationStatus = verification;

  const partners = await DeliveryPartner.find(filter)
    .populate("user", "name email phoneNumber avatar")
    .populate("activeOrder", "orderStatus finalTotal deliveryInfo.address restaurant")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: partners.length,
    partners,
  });
});

/**
 * Approve or reject delivery partner verification (Admin only)
 * PUT /api/v1/admin/delivery-partners/:id/verify
 */
exports.verifyDeliveryPartner = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { status, reason } = req.body; // status: 'approved' | 'rejected' | 'suspended'

  if (!["approved", "rejected", "suspended"].includes(status)) {
    return next(new ErrorHandler("Invalid status. Allowed: approved, rejected, suspended", 400));
  }

  const partner = await DeliveryPartner.findById(id).populate("user");
  if (!partner) {
    return next(new ErrorHandler("Delivery partner not found", 404));
  }

  partner.verificationStatus = status;
  partner.verifiedAt = status === "approved" ? new Date() : null;
  partner.verifiedBy = req.user._id;
  if (status === "rejected") {
    partner.rejectionReason = reason || "Documents could not be verified";
  }

  await partner.save();

  // If approved, update user's system role to 'delivery_partner'
  if (status === "approved" && partner.user) {
    await User.findByIdAndUpdate(partner.user._id, { role: "delivery_partner" });

    await notifyUser({
      userId: partner.user._id,
      type: "delivery_partner_approved",
      title: "Delivery Partner Approved! 🛵",
      message: "Congratulations! Your delivery partner account is verified. You can now go online to accept orders.",
    });
  } else if (status === "rejected" && partner.user) {
    await notifyUser({
      userId: partner.user._id,
      type: "delivery_partner_rejected",
      title: "Application Status Update ⚠️",
      message: `Your delivery partner application was rejected: ${partner.rejectionReason}`,
    });
  }

  res.status(200).json({
    success: true,
    message: `Delivery partner ${status} successfully`,
    partner,
  });
});

/**
 * Assign order to a verified delivery partner (Admin only)
 * POST /api/v1/admin/orders/:id/assign
 */
exports.assignOrderToPartner = catchAsyncErrors(async (req, res, next) => {
  const { id: orderId } = req.params;
  const { partnerId } = req.body;

  if (!partnerId) {
    return next(new ErrorHandler("Delivery partner ID is required", 400));
  }

  const order = await Order.findById(orderId)
    .populate("restaurant", "name address location")
    .populate("user", "name email phoneNumber");

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Prevent assignment of cancelled or delivered orders
  if (["Delivered", "Cancelled", "Rejected"].includes(order.orderStatus)) {
    return next(
      new ErrorHandler(`Cannot assign order with status '${order.orderStatus}'`, 400)
    );
  }

  // Check if order is already assigned
  if (order.assignedDeliveryPartner) {
    return next(
      new ErrorHandler("This order is already assigned to a delivery partner", 400)
    );
  }

  // Validate partner
  const partner = await DeliveryPartner.findById(partnerId).populate("user", "name phoneNumber avatar");
  if (!partner) {
    return next(new ErrorHandler("Delivery partner not found", 404));
  }

  if (partner.verificationStatus !== "approved") {
    return next(
      new ErrorHandler(`Cannot assign: Partner is not approved (Status: ${partner.verificationStatus})`, 400)
    );
  }

  if (!partner.isOnline || partner.availabilityStatus === "offline") {
    return next(
      new ErrorHandler("Cannot assign: Delivery partner is currently offline", 400)
    );
  }

  if (partner.availabilityStatus === "busy" || partner.activeOrder) {
    return next(
      new ErrorHandler("Cannot assign: Delivery partner already has an active delivery in progress", 400)
    );
  }

  // Generate secure 4-digit numeric OTP for delivery confirmation
  const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

  // Update order record
  order.assignedDeliveryPartner = partner._id;
  order.orderStatus = "Assigned";
  order.assignedAt = new Date();
  order.deliveryOtp = deliveryOtp;
  order.deliveryPartner = {
    partnerId: partner._id,
    name: partner.user?.name || "Delivery Partner",
    phoneNo: partner.phone,
    vehicleNumber: partner.vehicleNumber,
    rating: partner.rating || 4.9,
    avatar:
      partner.user?.avatar?.url ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  };

  await order.save();

  // Update partner record
  partner.activeOrder = order._id;
  partner.availabilityStatus = "busy";
  if (!partner.assignedOrders.includes(order._id)) {
    partner.assignedOrders.push(order._id);
  }
  await partner.save();

  // Socket notification & real-time lifecycle event
  const io = getIO();
  const assignmentPayload = {
    orderId: order._id.toString(),
    orderStatus: order.orderStatus,
    deliveryPartner: order.deliveryPartner,
    order,
    deliveryOtp,
    timestamp: new Date(),
  };

  if (io) {
    // Notify delivery partner directly
    if (partner.user?._id) {
      io.to(`user:${partner.user._id}`).emit("order:assigned", assignmentPayload);
    }
    // Notify customer
    if (order.user?._id) {
      io.to(`user:${order.user._id}`).emit("order:assigned", assignmentPayload);
      io.to(`user:${order.user._id}`).emit("order:status_updated", assignmentPayload);
    }
    // Notify restaurant & admin
    if (order.restaurant?._id) {
      io.to(`restaurant:${order.restaurant._id}`).emit("order:status_updated", assignmentPayload);
    }
    io.to("admin").emit("order:status_updated", assignmentPayload);
  }

  // Persistent in-app notifications
  if (partner.user?._id) {
    await notifyUser({
      userId: partner.user._id,
      type: "order_assigned",
      title: "New Delivery Assigned! 🛵",
      message: `You have been assigned order #${order._id.toString().slice(-6).toUpperCase()} at ${order.restaurant?.name || "Restaurant"}.`,
      orderId: order._id,
    });
  }

  if (order.user?._id) {
    await notifyUser({
      userId: order.user._id,
      type: "order_assigned",
      title: "Delivery Partner Assigned! 🛵",
      message: `${partner.user?.name || "Rahul"} (${partner.vehicleNumber}) has been assigned to deliver your order.`,
      orderId: order._id,
    });
  }

  res.status(200).json({
    success: true,
    message: "Order assigned to delivery partner successfully",
    order,
  });
});

// =========================================================================
// 4. DELIVERY WORKFLOW (STATUS TRANSITIONS)
// =========================================================================

/**
 * Partner marks order as Picked Up from restaurant
 * PUT /api/v1/delivery/orders/:id/pickup
 */
exports.markOrderPickedUp = catchAsyncErrors(async (req, res, next) => {
  const { id: orderId } = req.params;

  const partner = await DeliveryPartner.findOne({ user: req.user._id });
  if (!partner) {
    return next(new ErrorHandler("Delivery partner profile not found", 404));
  }

  const order = await Order.findById(orderId).populate("restaurant", "name");
  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Verify ownership
  if (
    !order.assignedDeliveryPartner ||
    order.assignedDeliveryPartner.toString() !== partner._id.toString()
  ) {
    return next(new ErrorHandler("You are not assigned to this delivery order", 403));
  }

  // Validate state transition
  if (!["Assigned", "Ready for Pickup", "Preparing"].includes(order.orderStatus)) {
    return next(
      new ErrorHandler(
        `Cannot pick up order in status '${order.orderStatus}'. Expected 'Assigned' or 'Ready for Pickup'.`,
        400
      )
    );
  }

  order.orderStatus = "Picked Up";
  order.pickedUpAt = new Date();
  await order.save();

  await emitOrderLifecycleEvent("order:picked_up", order);

  res.status(200).json({
    success: true,
    message: "Order successfully marked as Picked Up",
    order,
  });
});

/**
 * Partner marks order as Out for Delivery
 * PUT /api/v1/delivery/orders/:id/out-for-delivery
 */
exports.markOrderOutForDelivery = catchAsyncErrors(async (req, res, next) => {
  const { id: orderId } = req.params;

  const partner = await DeliveryPartner.findOne({ user: req.user._id });
  if (!partner) {
    return next(new ErrorHandler("Delivery partner profile not found", 404));
  }

  const order = await Order.findById(orderId).populate("restaurant", "name");
  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Verify ownership
  if (
    !order.assignedDeliveryPartner ||
    order.assignedDeliveryPartner.toString() !== partner._id.toString()
  ) {
    return next(new ErrorHandler("You are not assigned to this delivery order", 403));
  }

  // Validate state transition
  if (order.orderStatus !== "Picked Up" && order.orderStatus !== "Assigned") {
    return next(
      new ErrorHandler(
        `Cannot set Out for Delivery from '${order.orderStatus}'. Please mark as Picked Up first.`,
        400
      )
    );
  }

  order.orderStatus = "Out for Delivery";
  order.outForDeliveryAt = new Date();
  await order.save();

  await emitOrderLifecycleEvent("order:out_for_delivery", order);

  res.status(200).json({
    success: true,
    message: "Order is now Out for Delivery! Live GPS tracking active.",
    order,
  });
});

/**
 * Partner marks order Delivered with SECURE OTP CONFIRMATION
 * PUT /api/v1/delivery/orders/:id/deliver
 */
exports.markOrderDelivered = catchAsyncErrors(async (req, res, next) => {
  const { id: orderId } = req.params;
  const { otp } = req.body;

  if (!otp) {
    return next(new ErrorHandler("Customer delivery OTP is required to complete delivery", 400));
  }

  const partner = await DeliveryPartner.findOne({ user: req.user._id });
  if (!partner) {
    return next(new ErrorHandler("Delivery partner profile not found", 404));
  }

  const order = await Order.findById(orderId).populate("restaurant", "name");
  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Verify ownership
  if (
    !order.assignedDeliveryPartner ||
    order.assignedDeliveryPartner.toString() !== partner._id.toString()
  ) {
    return next(new ErrorHandler("You are not assigned to this delivery order", 403));
  }

  // Validate state transition
  if (order.orderStatus !== "Out for Delivery" && order.orderStatus !== "Picked Up") {
    return next(
      new ErrorHandler(
        `Cannot mark delivered: Order must be 'Out for Delivery'. Current status: '${order.orderStatus}'.`,
        400
      )
    );
  }

  // SECURE OTP VERIFICATION
  if (String(order.deliveryOtp).trim() !== String(otp).trim()) {
    return next(
      new ErrorHandler("Invalid Delivery OTP. Please ask the customer for the correct 4-digit PIN.", 400)
    );
  }

  // Update order status
  order.orderStatus = "Delivered";
  order.deliveredAt = new Date();
  await order.save();

  // Calculate actual earnings for this delivery
  const baseDeliveryFee = Number(order.deliveryCharge) || 50;
  const tipAmount = 0;
  const incentive = 10;
  const totalEarningForTrip = baseDeliveryFee + tipAmount + incentive;

  // Update partner record
  partner.totalCompletedDeliveries += 1;
  partner.activeOrder = null;
  partner.availabilityStatus = partner.isOnline ? "available" : "offline";

  // Append earnings history
  partner.earnings.totalEarnings += totalEarningForTrip;
  partner.earnings.pendingPayout += totalEarningForTrip;
  partner.earnings.history.push({
    order: order._id,
    amount: totalEarningForTrip,
    deliveryFee: baseDeliveryFee,
    tip: tipAmount,
    date: new Date(),
    status: "credited",
  });

  await partner.save();

  // Emit lifecycle event to notify customer, admin, and restaurant
  await emitOrderLifecycleEvent("order:delivered", order);

  // Notify delivery partner of credited earnings
  await notifyUser({
    userId: req.user._id,
    type: "system",
    title: "Delivery Completed! 💰",
    message: `Order delivered successfully! ₹${totalEarningForTrip} has been credited to your earnings.`,
    orderId: order._id,
  });

  res.status(200).json({
    success: true,
    message: "Order delivered successfully!",
    earningsEarned: totalEarningForTrip,
    order,
  });
});

// =========================================================================
// 5. REAL-TIME GPS TRACKING (REST & SOCKET INTEGRATION)
// =========================================================================

/**
 * REST Fallback endpoint for GPS location update
 * POST /api/v1/delivery/location
 */
exports.updateLocationREST = catchAsyncErrors(async (req, res, next) => {
  const { latitude, longitude, heading, speed, orderId } = req.body;

  const lat = Number(latitude);
  const lon = Number(longitude);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return next(new ErrorHandler("Invalid GPS coordinates provided", 400));
  }

  const partner = await DeliveryPartner.findOne({ user: req.user._id });
  if (!partner) {
    return next(new ErrorHandler("Delivery partner profile not found", 404));
  }

  // Verify partner has an active assignment if orderId provided
  let targetOrder = null;
  if (orderId) {
    targetOrder = await Order.findById(orderId);
    if (
      !targetOrder ||
      !targetOrder.assignedDeliveryPartner ||
      targetOrder.assignedDeliveryPartner.toString() !== partner._id.toString()
    ) {
      return next(new ErrorHandler("Unauthorized: You are not assigned to this order", 403));
    }
  } else if (partner.activeOrder) {
    targetOrder = await Order.findById(partner.activeOrder);
  }

  const now = new Date();

  // Persist latest location
  partner.currentLocation = {
    type: "Point",
    coordinates: [lon, lat],
    latitude: lat,
    longitude: lon,
    heading: Number(heading) || 0,
    speed: Number(speed) || 0,
    updatedAt: now,
  };
  partner.lastLocationUpdate = now;
  await partner.save();

  // Broadcast to customer and admin
  const io = getIO();
  if (io && targetOrder) {
    const locationPayload = {
      orderId: targetOrder._id.toString(),
      partnerId: partner._id.toString(),
      partnerName: req.user.name,
      latitude: lat,
      longitude: lon,
      heading: Number(heading) || 0,
      speed: Number(speed) || 0,
      timestamp: now,
      orderStatus: targetOrder.orderStatus,
    };

    if (targetOrder.user) {
      io.to(`user:${targetOrder.user.toString()}`).emit("delivery:location", locationPayload);
    }
    io.to("admin").emit("delivery:location", locationPayload);
  }

  res.status(200).json({
    success: true,
    location: {
      latitude: lat,
      longitude: lon,
      updatedAt: now,
    },
  });
});

// =========================================================================
// 6. EARNINGS ANALYTICS
// =========================================================================

/**
 * Get delivery partner earnings summary and date-wise history
 * GET /api/v1/delivery/earnings
 */
exports.getPartnerEarnings = catchAsyncErrors(async (req, res, next) => {
  const partner = await DeliveryPartner.findOne({ user: req.user._id })
    .populate({
      path: "earnings.history.order",
      select: "orderStatus finalTotal deliveryCharge createdAt deliveryInfo.city",
    });

  if (!partner) {
    return next(new ErrorHandler("Delivery partner profile not found", 404));
  }

  const history = partner.earnings?.history || [];

  // Calculate today's earnings
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayEarnings = history
    .filter((h) => new Date(h.date) >= startOfToday)
    .reduce((sum, h) => sum + (h.amount || 0), 0);

  const todayCount = history.filter((h) => new Date(h.date) >= startOfToday).length;

  res.status(200).json({
    success: true,
    earnings: {
      totalEarnings: partner.earnings.totalEarnings || 0,
      pendingPayout: partner.earnings.pendingPayout || 0,
      completedPayout: partner.earnings.completedPayout || 0,
      totalCompletedDeliveries: partner.totalCompletedDeliveries || 0,
      todayEarnings,
      todayDeliveriesCount: todayCount,
      history: history.sort((a, b) => new Date(b.date) - new Date(a.date)),
    },
  });
});

/**
 * Get real-time order tracking details for customer or assigned partner
 * GET /api/v1/delivery/orders/:id/track
 */
exports.getOrderTracking = catchAsyncErrors(async (req, res, next) => {
  const { id: orderId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return next(new ErrorHandler("Invalid order ID", 400));
  }

  const order = await Order.findById(orderId)
    .populate("restaurant", "name address location phoneNumber")
    .populate("assignedDeliveryPartner");

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  const userIdStr = req.user._id ? req.user._id.toString() : req.user.id.toString();
  const orderUserStr = order.user ? order.user.toString() : null;
  const isAdmin = req.user.role === "admin";
  const isCustomer = orderUserStr === userIdStr;

  let isAssignedPartner = false;
  if (order.assignedDeliveryPartner) {
    const partner = await DeliveryPartner.findById(order.assignedDeliveryPartner);
    if (partner && partner.user && partner.user.toString() === userIdStr) {
      isAssignedPartner = true;
    }
  }

  if (!isCustomer && !isAdmin && !isAssignedPartner) {
    return next(new ErrorHandler("Unauthorized: You can only track your own order", 403));
  }

  let partnerLocation = null;
  let partnerInfo = null;

  if (order.assignedDeliveryPartner) {
    const partner = await DeliveryPartner.findById(order.assignedDeliveryPartner).populate("user", "name avatar");
    if (partner) {
      partnerInfo = {
        name: partner.user?.name || order.deliveryPartner?.name || "Delivery Partner",
        phone: partner.phone || order.deliveryPartner?.phoneNo,
        vehicleNumber: partner.vehicleNumber || order.deliveryPartner?.vehicleNumber,
        rating: partner.rating || 4.9,
        avatar: partner.user?.avatar?.url || order.deliveryPartner?.avatar,
      };

      if (partner.currentLocation && partner.currentLocation.latitude) {
        partnerLocation = {
          latitude: partner.currentLocation.latitude,
          longitude: partner.currentLocation.longitude,
          heading: partner.currentLocation.heading || 0,
          speed: partner.currentLocation.speed || 0,
          updatedAt: partner.lastLocationUpdate || partner.currentLocation.updatedAt,
        };
      }
    }
  }

  res.status(200).json({
    success: true,
    tracking: {
      orderId: order._id,
      orderStatus: order.orderStatus,
      restaurant: {
        name: order.restaurant?.name || "Restaurant",
        address: order.restaurant?.address || "Address",
        location: order.restaurant?.location || { coordinates: [73.8567, 18.5204] },
      },
      destination: {
        address: order.deliveryInfo?.address,
        city: order.deliveryInfo?.city,
        postalCode: order.deliveryInfo?.postalCode,
      },
      partner: partnerInfo,
      partnerLocation,
      deliveryOtp: isCustomer || isAdmin ? order.deliveryOtp : undefined,
      milestones: {
        createdAt: order.createdAt,
        assignedAt: order.assignedAt,
        pickedUpAt: order.pickedUpAt,
        outForDeliveryAt: order.outForDeliveryAt,
        deliveredAt: order.deliveredAt,
      },
    },
  });
});

