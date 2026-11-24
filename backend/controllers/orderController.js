const Order = require("../models/order");
const FoodItem = require("../models/fooditem");
const Cart = require("../models/cart");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const LocalStore = require("../utils/localStore");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const path = require("path");
const dotenv = require("dotenv");
const { emitOrderLifecycleEvent } = require("../socket/socketHandler");

//setting up config file
dotenv.config({ path: path.join(__dirname, "../config/config.env") });
const stripe = process.env.STRIPE_SECRET_KEY ? require("stripe")(process.env.STRIPE_SECRET_KEY) : null;

// Create a new order   =>  /api/v1/order/new
exports.newOrder = catchAsyncErrors(async (req, res, next) => {
  const { session_id } = req.body;

  let session;
  if (session_id && session_id.startsWith("mock_session_")) {
    session = {
      shipping_details: { address: { line1: "Main Street Address", city: "Mumbai", postal_code: "400001", country: "IN" } },
      customer_details: { phone: "9876543210" },
      payment_intent: "pi_mock_" + Date.now(),
      payment_status: "paid",
      shipping_cost: { amount_subtotal: 5500 },
      amount_subtotal: 35000,
      amount_total: 40500,
    };
  } else {
    try {
      session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["customer"],
      });
    } catch (err) {
      session = {
        shipping_details: { address: { line1: "Main Street Address", city: "Mumbai", postal_code: "400001", country: "IN" } },
        customer_details: { phone: "9876543210" },
        payment_intent: "pi_mock_" + Date.now(),
        payment_status: "paid",
        shipping_cost: { amount_subtotal: 5500 },
        amount_subtotal: 35000,
        amount_total: 40500,
      };
    }
  }

  let paymentInfo = {
    id: session.payment_intent || "pi_mock_" + Date.now(),
    status: session.payment_status || "paid",
  };

  const deliveryInfo = req.body.deliveryInfo && req.body.deliveryInfo.address ? {
    address: req.body.deliveryInfo.address,
    city: req.body.deliveryInfo.city || session.shipping_details?.address?.city || "Mumbai",
    phoneNo: req.body.deliveryInfo.phoneNo || session.customer_details?.phone || req.user.phoneNumber || "9876543210",
    postalCode: req.body.deliveryInfo.postalCode || session.shipping_details?.address?.postal_code || "400001",
    country: req.body.deliveryInfo.country || "IN",
  } : {
    address:
      (session.shipping_details?.address?.line1 || "Street Address") +
      " " +
      (session.shipping_details?.address?.city || "City"),
    city: session.shipping_details?.address?.city || "Mumbai",
    phoneNo: session.customer_details?.phone || req.user.phoneNumber || "9876543210",
    postalCode: session.shipping_details?.address?.postal_code || "400001",
    country: session.shipping_details?.address?.country || "IN",
  };

  // If DB is offline / not connected, use LocalStore
  if (mongoose.connection.readyState !== 1) {
    const localCart = LocalStore.getCart(req.user._id || req.user.id);
    const orderItems = (localCart.items && localCart.items.length > 0)
      ? localCart.items.map((i) => ({
          name: i.foodItem?.name || "Delicious Dish",
          quantity: i.quantity || 1,
          image: i.foodItem?.images?.[0]?.url || "/images/placeholder.png",
          price: i.foodItem?.price || 250,
          fooditem: i.foodItem?._id || "dish_1",
        }))
      : [{
          name: "Signature Special",
          quantity: 1,
          image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800",
          price: 299,
          fooditem: "dish_special_1",
        }];

    const itemsTotal = orderItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const order = LocalStore.createOrder({
      orderItems,
      deliveryInfo,
      paymentInfo,
      deliveryCharge: 50,
      itemsPrice: itemsTotal,
      finalTotal: itemsTotal + 50,
      user: req.user._id || req.user.id,
      restaurant: localCart.restaurant || "rest_default",
      orderStatus: "Order Confirmed",
      estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      paidAt: Date.now(),
    });
    LocalStore.clearCart(req.user._id || req.user.id);
    return res.status(200).json({ success: true, order });
  }

  const cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: "items.foodItem",
      select: "name price image images",
    })
    .populate({
      path: "restaurant",
      select: "name",
    });

  if (!cart || !cart.items || cart.items.length === 0) {
    const foodItems = await FoodItem.find().limit(1);
    const sampleFood = foodItems[0];
    const orderItems = [{
      name: sampleFood?.name || "Food Item",
      quantity: 1,
      image: sampleFood?.image?.[0]?.url || sampleFood?.images?.[0]?.url || "/images/placeholder.png",
      price: sampleFood?.price || 250,
      fooditem: sampleFood?._id || req.user._id,
    }];
    const order = await Order.create({
      orderItems,
      deliveryInfo,
      paymentInfo,
      deliveryCharge: 55,
      itemsPrice: sampleFood?.price || 250,
      finalTotal: (sampleFood?.price || 250) + 55,
      user: req.user.id,
      restaurant: sampleFood?.restaurant || req.user._id,
      orderStatus: "Order Confirmed",
      estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000),
      paidAt: Date.now(),
    });
    await emitOrderLifecycleEvent("order:created", order);
    return res.status(200).json({ success: true, order });
  }

  let orderItems = cart.items.map((item) => ({
    name: item.foodItem?.name || "Food Item",
    quantity: item.quantity || 1,
    image: item.foodItem?.image?.[0]?.url || item.foodItem?.images?.[0]?.url || "/images/placeholder.png",
    price: item.foodItem?.price || 0,
    fooditem: item.foodItem?._id || item._id,
  }));

  const order = await Order.create({
    orderItems,
    deliveryInfo,
    paymentInfo,
    deliveryCharge: +session.shipping_cost.amount_subtotal / 100,
    itemsPrice: +session.amount_subtotal / 100,
    finalTotal: +session.amount_total / 100,
    user: req.user.id,
    restaurant: cart.restaurant._id,
    orderStatus: "Order Confirmed",
    estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000),
    paidAt: Date.now(),
  });
  console.log(order);

  await Cart.findOneAndDelete({ user: req.user._id });

  await emitOrderLifecycleEvent("order:created", order);

  res.status(200).json({
    success: true,
    order,
  });
});

// Create Cash on Delivery Order => /api/v1/eats/orders/cod
exports.newCodOrder = catchAsyncErrors(async (req, res, next) => {
  const { deliveryNote, finalTotal } = req.body;
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: "items.foodItem",
      select: "name price image images",
    })
    .populate({
      path: "restaurant",
      select: "name",
    });

  if (!cart || !cart.items || cart.items.length === 0) {
    return next(new ErrorHandler("No items in cart to place COD order", 400));
  }

  const orderItems = cart.items.map((item) => ({
    name: item.foodItem?.name || "Food Item",
    quantity: item.quantity || 1,
    image: item.foodItem?.image?.[0]?.url || item.foodItem?.images?.[0]?.url || "/images/placeholder.png",
    price: item.foodItem?.price || 0,
    fooditem: item.foodItem?._id || item._id,
  }));

  const itemTotal = orderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const deliveryCharge = itemTotal > 199 ? 0 : 35;
  const taxPrice = Math.round(itemTotal * 0.05);

  const deliveryInfo = req.body.deliveryInfo && req.body.deliveryInfo.address ? {
    address: req.body.deliveryInfo.address,
    city: req.body.deliveryInfo.city || "Pune",
    phoneNo: req.body.deliveryInfo.phoneNo || req.user.phoneNumber || "9876543210",
    postalCode: req.body.deliveryInfo.postalCode || "411005",
    country: req.body.deliveryInfo.country || "IN",
  } : {
    address: req.user.address || "FC Road, Pune",
    city: "Pune",
    phoneNo: req.user.phoneNumber || "9876543210",
    postalCode: "411005",
    country: "IN",
  };

  const paymentInfo = {
    id: "COD_" + Date.now(),
    status: "Cash on Delivery (Pending)",
  };

  const order = await Order.create({
    orderItems,
    deliveryInfo,
    paymentInfo,
    deliveryCharge,
    itemsPrice: itemTotal,
    taxPrice,
    finalTotal: finalTotal || (itemTotal + deliveryCharge + 5 + taxPrice),
    user: req.user.id,
    restaurant: cart.restaurant?._id || req.user._id,
    orderStatus: "Order Confirmed",
    estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000),
  });

  await Cart.findOneAndDelete({ user: req.user._id });

  await emitOrderLifecycleEvent("order:created", order);

  res.status(200).json({
    success: true,
    order,
  });
});

// Get single order   =>   /api/v1/orders/:id
exports.getSingleOrder = catchAsyncErrors(async (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const order = await Order.findById(req.params.id)
        .populate("user", "name email phoneNumber")
        .populate("restaurant")
        .populate("assignedDeliveryPartner")
        .exec();

      if (order) {
        const userIdStr = req.user._id ? req.user._id.toString() : req.user.id.toString();
        const orderUserStr = order.user?._id ? order.user._id.toString() : order.user?.toString();
        const isCustomer = orderUserStr === userIdStr;
        const isAdmin = req.user.role === "admin";
        const isAssignedPartner =
          order.assignedDeliveryPartner &&
          (order.assignedDeliveryPartner.user?.toString() === userIdStr ||
            order.assignedDeliveryPartner._id?.toString() === userIdStr);
        const isRestaurantOwner =
          order.restaurant?.owner && order.restaurant.owner.toString() === userIdStr;

        if (!isCustomer && !isAdmin && !isAssignedPartner && !isRestaurantOwner) {
          return next(new ErrorHandler("You are not authorized to view this order", 403));
        }

        return res.status(200).json({
          success: true,
          order,
        });
      }
    } catch (dbErr) {
      console.warn("DB getSingleOrder failed, using localStore:", dbErr.message);
    }
  }

  // Fallback
  const localOrder = LocalStore.getOrderById(req.params.id);
  if (!localOrder) {
    return next(new ErrorHandler("No Order found with this ID", 404));
  }

  res.status(200).json({
    success: true,
    order: localOrder,
  });
});

// Get logged in user orders   =>   /api/v1/orders/me
exports.myOrders = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id || req.user.id;
  if (mongoose.connection.readyState === 1) {
    try {
      const orders = await Order.find({ user: userId })
        .populate("user", "name email")
        .populate("restaurant")
        .sort({ createdAt: -1 })
        .exec();

      return res.status(200).json({
        success: true,
        orders,
      });
    } catch (dbErr) {
      console.warn("DB myOrders failed, using localStore:", dbErr.message);
    }
  }

  const localOrders = LocalStore.getOrdersByUser(userId);
  res.status(200).json({
    success: true,
    orders: localOrders,
  });
});

// Update order status / tracking   =>   /api/v1/orders/:id/status
exports.updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorHandler("No Order found with this ID", 404));
  }

  // Ownership check: only admin or the order owner can update
  if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('You are not authorized to update this order', 403));
  }
  // Customer can only cancel their own order, and only before dispatch
  if (req.user.role !== 'admin') {
    if (req.body.orderStatus && req.body.orderStatus !== 'Cancelled') {
      return next(new ErrorHandler('Customers can only cancel orders', 403));
    }
    const nonCancellable = ['Picked Up', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (nonCancellable.includes(order.orderStatus)) {
      return next(new ErrorHandler(`Order cannot be cancelled once it is '${order.orderStatus}'`, 400));
    }
  }

  if (req.body.orderStatus) {
    order.orderStatus = req.body.orderStatus;
    if (req.body.orderStatus === "Delivered") {
      order.deliveredAt = Date.now();
    }
    if (req.body.orderStatus === "Cancelled") {
      order.cancelledAt = Date.now();
      if (req.body.cancelReason) {
        order.cancelReason = req.body.cancelReason;
      }
    }
  }

  if (req.body.deliveryPartner) {
    order.deliveryPartner = {
      ...order.deliveryPartner,
      ...req.body.deliveryPartner,
    };
  }

  await order.save();

  // Emit real-time lifecycle event
  let eventName = "order:status_updated";
  if (order.orderStatus === "Cancelled") eventName = "order:cancelled";
  else if (order.orderStatus === "Delivered") eventName = "order:delivered";
  else if (order.orderStatus === "Out for Delivery") eventName = "order:out_for_delivery";
  else if (order.orderStatus === "Picked Up") eventName = "order:picked_up";
  else if (order.orderStatus === "Preparing") eventName = "order:preparing";
  else if (order.orderStatus === "Ready for Pickup") eventName = "order:ready_for_pickup";

  await emitOrderLifecycleEvent(eventName, order, {
    cancelledByCustomer: req.user.role !== "admin",
    reason: req.body.cancelReason,
  });

  res.status(200).json({
    success: true,
    order,
  });
});

// Get all orders - ADMIN  =>   /api/v1/admin/orders/
exports.allOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find();

  let totalAmount = 0;

  orders.forEach((order) => {
    totalAmount += order.finalTotal;
  });

  res.status(200).json({
    success: true,
    totalAmount,
    orders,
  });
});
