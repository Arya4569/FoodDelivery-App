const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "config/config.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();

const menuRoutes = require("./routes/menu");
const restaurantRoutes = require("./routes/restaurantt");
const auth = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");
const aiRoutes = require("./routes/ai.routes");
const orderRoutes = require("./routes/order");
const locationRoutes = require("./routes/location");
const foodItemRoutes = require("./routes/foodItem");
const ownerRoutes = require("./routes/ownerRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const deliveryPartnerRoutes = require("./routes/deliveryPartnerRoutes");

const errorMiddleware = require("./middlewares/errors");

// Security middleware
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// General rate limit: 1000 req / 15 min
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use(generalLimiter);

// Stricter auth rate limit: 100 req / 15 min for smooth testing & dev
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' }
});
app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/users/register', authLimiter);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/api/v1/location", locationRoutes);          // ✅ Realtime Geolocation routes
app.use("/api/v1/menu", menuRoutes);              // ✅ Menu routes
app.use("/api/v1/restaurants", restaurantRoutes); // ✅ Restaurant routes
app.use("/api/v1/foods", foodItemRoutes);
app.use("/api/v1/owner", ownerRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/delivery", deliveryPartnerRoutes);
app.use("/api/v1/users", auth);
app.use("/api/v1/users/cart", cartRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/eats/orders", orderRoutes);
app.use("/api/v1/orders", orderRoutes);
app.get("/", (req, res) => {
    res.send("Food Delivery API Running");
});

app.use(errorMiddleware);

module.exports = app;