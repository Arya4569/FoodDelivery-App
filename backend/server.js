const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "config/config.env") });

const http = require("http");
const app = require("./app");
const mongoose = require("mongoose");
const { initSocket } = require("./socket/socketHandler");

if (process.env.DB_URI) {
  mongoose.connect(process.env.DB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then((con) => {
    console.log(`MongoDB Connected: ${con.connection.host}`);
  })
  .catch((err) => {
    console.log("MongoDB connection failed:", err.message);
    console.log("API running with offline/local fallback data.");
  });
}

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO with HTTP server
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server and Socket.IO running on PORT: ${PORT}`);
});
