const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const DATA_DIR = path.join(__dirname, "../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, "localUsers.json");
const CARTS_FILE = path.join(DATA_DIR, "localCarts.json");
const ORDERS_FILE = path.join(DATA_DIR, "localOrders.json");

function readJson(file, def = []) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
  return def;
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error(`Error writing ${file}:`, e.message);
  }
}

class LocalStore {
  // --- USERS ---
  static async createUser({ name, email, password, phoneNumber, avatar, role = "user" }) {
    const users = readJson(USERS_FILE, []);
    const normalizedEmail = (email || "").toLowerCase().trim();
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error("User already exists with this email");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      _id: "user_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      name: name || "Foodie User",
      email: normalizedEmail,
      phoneNumber: phoneNumber || "9876543210",
      password: hashedPassword,
      role: role || "user",
      avatar: avatar || { public_id: "default", url: "/images/images.png" },
      addresses: [],
      favoriteRestaurants: [],
      favoriteFoodItems: [],
      createdAt: new Date().toISOString(),
      correctPassword: async function (candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
      },
      getJWTToken: function () {
        return jwt.sign(
          { id: this._id },
          process.env.JWT_SECRET || "default_jwt_secret",
          { expiresIn: process.env.JWT_EXPIRE || "90d" }
        );
      },
    };

    users.push(newUser);
    writeJson(USERS_FILE, users);
    return newUser;
  }

  static async findUserByEmail(email) {
    const users = readJson(USERS_FILE, []);
    const normalizedEmail = (email || "").toLowerCase().trim();
    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) return null;

    // Attach helper methods
    user.correctPassword = async function (candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    };
    user.getJWTToken = function () {
      return jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET || "default_jwt_secret",
        { expiresIn: process.env.JWT_EXPIRE || "90d" }
      );
    };
    return user;
  }

  static async findUserById(id) {
    const users = readJson(USERS_FILE, []);
    const user = users.find((u) => u._id === id || String(u._id) === String(id));
    if (!user) return null;

    user.correctPassword = async function (candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    };
    user.getJWTToken = function () {
      return jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET || "default_jwt_secret",
        { expiresIn: process.env.JWT_EXPIRE || "90d" }
      );
    };
    return user;
  }

  static async updateUser(id, updates) {
    const users = readJson(USERS_FILE, []);
    const idx = users.findIndex((u) => u._id === id || String(u._id) === String(id));
    if (idx === -1) return null;

    users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
    writeJson(USERS_FILE, users);
    return users[idx];
  }

  // --- CARTS ---
  static getCart(userId) {
    const carts = readJson(CARTS_FILE, {});
    return carts[userId] || { user: userId, restaurant: null, items: [] };
  }

  static saveCart(userId, cartData) {
    const carts = readJson(CARTS_FILE, {});
    carts[userId] = cartData;
    writeJson(CARTS_FILE, carts);
    return cartData;
  }

  static clearCart(userId) {
    const carts = readJson(CARTS_FILE, {});
    delete carts[userId];
    writeJson(CARTS_FILE, carts);
    return { success: true };
  }

  // --- ORDERS ---
  static createOrder(orderData) {
    const orders = readJson(ORDERS_FILE, []);
    const newOrder = {
      _id: "order_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      orderStatus: "Order Placed",
      createdAt: new Date().toISOString(),
      ...orderData,
    };
    orders.unshift(newOrder);
    writeJson(ORDERS_FILE, orders);
    return newOrder;
  }

  static getOrdersByUser(userId) {
    const orders = readJson(ORDERS_FILE, []);
    return orders.filter(
      (o) => o.user === userId || o.user?._id === userId || String(o.user) === String(userId)
    );
  }

  static getOrderById(orderId) {
    const orders = readJson(ORDERS_FILE, []);
    return orders.find((o) => o._id === orderId || String(o._id) === String(orderId)) || null;
  }
}

module.exports = LocalStore;
