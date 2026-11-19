const { Server } = require("socket.io");
const mongoose = require("mongoose");
const { socketAuth } = require("./socketAuth");
const Restaurant = require("../models/restaurant");
const Notification = require("../models/notification");
const DeliveryPartner = require("../models/deliveryPartner");
const Order = require("../models/order");

let io = null;

/**
 * Initialize Socket.IO with the existing HTTP server instance
 */
exports.initSocket = (httpServer) => {
  if (io) return io;

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  io = new Server(httpServer, {
    cors: {
      origin: [frontendUrl, "http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authenticate every socket connection
  io.use(socketAuth);

  io.on("connection", (socket) => {
    const user = socket.user;
    console.log(`[Socket] User connected: ${user.name} (${user.role}) - ID: ${user._id}`);

    // Automatically join the user's private personal room
    const userRoom = `user:${user._id}`;
    socket.join(userRoom);

    // If admin, auto-join admin room
    if (user.role === "admin") {
      socket.join("admin");
      console.log(`[Socket] Admin ${user.name} joined room 'admin'`);
    }

    /**
     * Join a restaurant room (strict ownership authorization)
     */
    socket.on("join:restaurant", async (data, callback) => {
      try {
        const restaurantId = typeof data === "string" ? data : data?.restaurantId;

        if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
          const errPayload = { success: false, message: "Invalid Restaurant ID" };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:room_unauthorized", errPayload);
          return;
        }

        // Verify ownership
        if (user.role === "admin") {
          const roomName = `restaurant:${restaurantId}`;
          socket.join(roomName);
          console.log(`[Socket] Admin ${user.name} joined ${roomName}`);
          if (typeof callback === "function") callback({ success: true, room: roomName });
          return;
        }

        if (user.role !== "restaurant_owner" && user.role !== "owner") {
          const errPayload = {
            success: false,
            message: "Unauthorized: only restaurant owners can join restaurant rooms",
          };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:room_unauthorized", errPayload);
          return;
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          const errPayload = { success: false, message: "Restaurant not found" };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:room_unauthorized", errPayload);
          return;
        }

        if (
          !restaurant.owner ||
          restaurant.owner.toString() !== user._id.toString()
        ) {
          const errPayload = {
            success: false,
            message: "Unauthorized: You do not own this restaurant",
          };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:room_unauthorized", errPayload);
          return;
        }

        const roomName = `restaurant:${restaurantId}`;
        socket.join(roomName);
        console.log(`[Socket] Owner ${user.name} joined ${roomName}`);
        if (typeof callback === "function") callback({ success: true, room: roomName });
      } catch (err) {
        console.error("[Socket] join:restaurant error:", err.message);
        if (typeof callback === "function") {
          callback({ success: false, message: err.message });
        }
      }
    });

    /**
     * Leave restaurant room
     */
    socket.on("leave:restaurant", (data) => {
      const restaurantId = typeof data === "string" ? data : data?.restaurantId;
      if (restaurantId) {
        socket.leave(`restaurant:${restaurantId}`);
      }
    });

    /**
     * Real-time GPS Location Tracking from Delivery Partner
     */
    socket.on("delivery:location_update", async (data, callback) => {
      try {
        const { orderId, latitude, longitude, heading, speed } = data || {};

        const lat = Number(latitude);
        const lon = Number(longitude);

        // 1. Validate coordinates
        if (
          isNaN(lat) ||
          isNaN(lon) ||
          lat < -90 ||
          lat > 90 ||
          lon < -180 ||
          lon > 180
        ) {
          const errPayload = { success: false, message: "Invalid GPS coordinates" };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:location", errPayload);
          return;
        }

        // 2. Validate user role & partner profile
        const allowedRoles = ["delivery_partner", "admin"];
        if (!allowedRoles.includes(user.role)) {
          const errPayload = {
            success: false,
            message: "Unauthorized: only delivery partners can broadcast GPS location",
          };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:location", errPayload);
          return;
        }

        const partner = await DeliveryPartner.findOne({ user: user._id });
        if (!partner || partner.verificationStatus !== "approved") {
          const errPayload = {
            success: false,
            message: "Unauthorized: Delivery partner is not verified or approved",
          };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:location", errPayload);
          return;
        }

        // 3. Validate active order and assignment ownership
        const targetOrderId = orderId || partner.activeOrder;
        if (!targetOrderId || !mongoose.Types.ObjectId.isValid(targetOrderId)) {
          const errPayload = { success: false, message: "No active delivery order found" };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:location", errPayload);
          return;
        }

        const order = await Order.findById(targetOrderId);
        if (!order) {
          const errPayload = { success: false, message: "Order not found" };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:location", errPayload);
          return;
        }

        // Strict ownership check: Only assigned partner can update GPS
        if (
          !order.assignedDeliveryPartner ||
          order.assignedDeliveryPartner.toString() !== partner._id.toString()
        ) {
          const errPayload = {
            success: false,
            message: "Forbidden: You are not assigned to this delivery",
          };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:location", errPayload);
          return;
        }

        // 4. Verify order is in an active delivery status
        const activeStatuses = ["Assigned", "Picked Up", "Out for Delivery"];
        if (!activeStatuses.includes(order.orderStatus)) {
          const errPayload = {
            success: false,
            message: `Location sharing not active for order status '${order.orderStatus}'`,
          };
          if (typeof callback === "function") callback(errPayload);
          socket.emit("error:location", errPayload);
          return;
        }

        // 5. Throttling: Throttle updates to at most once per 1.5 seconds
        const now = Date.now();
        if (socket.lastLocationTime && now - socket.lastLocationTime < 1500) {
          // Acknowledge without DB rewrite
          if (typeof callback === "function") {
            callback({ success: true, throttled: true });
          }
          return;
        }
        socket.lastLocationTime = now;

        const timestamp = new Date();

        // 6. Update partner's latest location in MongoDB
        partner.currentLocation = {
          type: "Point",
          coordinates: [lon, lat],
          latitude: lat,
          longitude: lon,
          heading: Number(heading) || 0,
          speed: Number(speed) || 0,
          updatedAt: timestamp,
        };
        partner.lastLocationUpdate = timestamp;
        await partner.save();

        // 7. Secure broadcast ONLY to assigned customer & admin (NOT public, NOT exposed to unauthorized users)
        const locationPayload = {
          orderId: order._id.toString(),
          partnerId: partner._id.toString(),
          partnerName: user.name,
          vehicleNumber: partner.vehicleNumber,
          latitude: lat,
          longitude: lon,
          heading: Number(heading) || 0,
          speed: Number(speed) || 0,
          orderStatus: order.orderStatus,
          timestamp,
        };

        if (order.user) {
          io.to(`user:${order.user.toString()}`).emit(
            "delivery:location",
            locationPayload
          );
        }
        io.to("admin").emit("delivery:location", locationPayload);

        if (typeof callback === "function") {
          callback({ success: true, timestamp });
        }
      } catch (err) {
        console.error("[Socket] delivery:location_update error:", err.message);
        if (typeof callback === "function") {
          callback({ success: false, message: err.message });
        }
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] User disconnected: ${user.name} (${reason})`);
    });
  });

  return io;
};

/**
 * Return current Socket.IO instance
 */
exports.getIO = () => {
  return io;
};

/**
 * Persist notification in MongoDB and emit real-time event to the recipient
 */
exports.notifyUser = async ({
  userId,
  type = "order_status",
  title,
  message,
  orderId,
  metadata = {},
}) => {
  try {
    if (!userId) return null;

    // 1. Persist notification to MongoDB
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      order: orderId,
      metadata,
    });

    // 2. Emit real-time notification to user's private room
    if (io) {
      const userRoom = `user:${userId}`;
      io.to(userRoom).emit("notification:new", {
        notification,
      });

      // Update unread count
      const unreadCount = await Notification.countDocuments({
        user: userId,
        isRead: false,
      });
      io.to(userRoom).emit("notification:unread_count", { count: unreadCount });
    }

    return notification;
  } catch (err) {
    console.error("notifyUser error:", err.message);
    return null;
  }
};

/**
 * Emit order lifecycle event to relevant customer, restaurant, and admin rooms
 */
exports.emitOrderLifecycleEvent = async (eventName, order, options = {}) => {
  if (!order) return;

  const orderId = order._id ? order._id.toString() : order.toString();
  const userId = order.user?._id
    ? order.user._id.toString()
    : order.user
    ? order.user.toString()
    : null;
  const restaurantId = order.restaurant?._id
    ? order.restaurant._id.toString()
    : order.restaurant
    ? order.restaurant.toString()
    : null;

  const payload = {
    orderId,
    orderStatus: order.orderStatus,
    order,
    reason: options.reason || order.cancelReason || null,
    timestamp: new Date(),
  };

  if (io) {
    // 1. Emit to customer's private room
    if (userId) {
      io.to(`user:${userId}`).emit(eventName, payload);
      io.to(`user:${userId}`).emit("order:status_updated", payload);

      // Stop location tracking on customer side if delivered or cancelled
      if (order.orderStatus === "Delivered" || order.orderStatus === "Cancelled" || order.orderStatus === "Rejected") {
        io.to(`user:${userId}`).emit("delivery:stopped", { orderId, orderStatus: order.orderStatus });
      }
    }

    // 2. Emit to restaurant room
    if (restaurantId) {
      io.to(`restaurant:${restaurantId}`).emit(eventName, payload);
      io.to(`restaurant:${restaurantId}`).emit("order:status_updated", payload);
    }

    // 3. Emit to assigned delivery partner if present
    if (order.assignedDeliveryPartner) {
      (async () => {
        try {
          const partnerDoc = await DeliveryPartner.findById(order.assignedDeliveryPartner).select("user");
          if (partnerDoc && partnerDoc.user) {
            io.to(`user:${partnerDoc.user.toString()}`).emit(eventName, payload);
            io.to(`user:${partnerDoc.user.toString()}`).emit("order:status_updated", payload);
          }
        } catch (e) {
          console.error("Partner socket notify error:", e.message);
        }
      })();
    }

    // 4. Emit to admin room
    io.to("admin").emit(eventName, payload);
    io.to("admin").emit("order:status_updated", payload);
  }

  // Generate automated customer & owner notifications based on event
  try {
    const restaurantName = order.restaurant?.name || "the restaurant";

    if (eventName === "order:created") {
      // Notify customer
      if (userId) {
        await exports.notifyUser({
          userId,
          type: "order_created",
          title: "Order Placed Successfully! 🎉",
          message: `Your order #${orderId.slice(-6).toUpperCase()} at ${restaurantName} has been confirmed.`,
          orderId,
        });
      }

      // Notify restaurant owner
      if (restaurantId) {
        const restDoc = await Restaurant.findById(restaurantId).select("owner name");
        if (restDoc && restDoc.owner) {
          await exports.notifyUser({
            userId: restDoc.owner,
            type: "order_created",
            title: "New Incoming Order! 🔔",
            message: `New order #${orderId.slice(-6).toUpperCase()} received for ₹${order.finalTotal || 0}.`,
            orderId,
          });
        }
      }
    } else if (eventName === "order:preparing") {
      if (userId) {
        await exports.notifyUser({
          userId,
          type: "order_preparing",
          title: "Meal Being Prepared! 👨‍🍳",
          message: `${restaurantName} has accepted your order and started cooking.`,
          orderId,
        });
      }
    } else if (eventName === "order:ready_for_pickup") {
      if (userId) {
        await exports.notifyUser({
          userId,
          type: "order_ready",
          title: "Food Packed & Ready! 🛍️",
          message: `Your food is freshly packed and waiting for delivery partner pickup.`,
          orderId,
        });
      }
    } else if (eventName === "order:picked_up") {
      if (userId) {
        await exports.notifyUser({
          userId,
          type: "order_status",
          title: "Order Picked Up! 🛵",
          message: `Delivery partner is on the way with your food from ${restaurantName}.`,
          orderId,
        });
      }
    } else if (eventName === "order:out_for_delivery") {
      if (userId) {
        await exports.notifyUser({
          userId,
          type: "order_status",
          title: "Out for Delivery! 🚚",
          message: `Your order is arriving soon at your doorstep!`,
          orderId,
        });
      }
    } else if (eventName === "order:delivered") {
      if (userId) {
        await exports.notifyUser({
          userId,
          type: "order_delivered",
          title: "Order Delivered! 🍽️",
          message: `Enjoy your delicious meal! Don't forget to rate your dishes.`,
          orderId,
        });
      }
    } else if (eventName === "order:rejected" || eventName === "order:cancelled") {
      if (userId) {
        const reasonText = options.reason || order.cancelReason || "Order cancelled";
        await exports.notifyUser({
          userId,
          type: "order_cancelled",
          title: eventName === "order:rejected" ? "Order Rejected by Restaurant" : "Order Cancelled",
          message: `Order #${orderId.slice(-6).toUpperCase()} was ${
            eventName === "order:rejected" ? "rejected" : "cancelled"
          }. Reason: ${reasonText}`,
          orderId,
        });
      }

      // If cancelled by customer, notify restaurant owner
      if (restaurantId && options.cancelledByCustomer) {
        const restDoc = await Restaurant.findById(restaurantId).select("owner");
        if (restDoc && restDoc.owner) {
          await exports.notifyUser({
            userId: restDoc.owner,
            type: "order_cancelled",
            title: "Order Cancelled by Customer",
            message: `Order #${orderId.slice(-6).toUpperCase()} was cancelled by customer.`,
            orderId,
          });
        }
      }
    }
  } catch (notifErr) {
    console.error("Lifecycle notification dispatch error:", notifErr.message);
  }
};

