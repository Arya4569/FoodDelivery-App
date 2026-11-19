const jwt = require("jsonwebtoken");
const User = require("../models/user");

/**
 * Socket.IO authentication middleware.
 * Verifies JWT token from handshake auth or headers, looks up user in MongoDB,
 * and attaches verified user object to socket.
 */
exports.socketAuth = async (socket, next) => {
  try {
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization;

    if (!token && socket.handshake.query?.token) {
      token = socket.handshake.query.token;
    }

    if (!token) {
      return next(new Error("Authentication error: Token required"));
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return next(new Error("Authentication error: Token expired"));
      }
      return next(new Error("Authentication error: Invalid token"));
    }

    // Fetch user from MongoDB
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // Attach user to socket
    socket.user = user;
    next();
  } catch (err) {
    console.error("Socket authentication unexpected error:", err.message);
    next(new Error("Authentication error: Internal authorization failure"));
  }
};

