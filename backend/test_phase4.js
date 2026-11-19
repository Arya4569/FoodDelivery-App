const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "config/config.env") });

const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const axios = require("axios");
const { io: ClientIO } = require("socket.io-client");

const app = require("./app");
const { initSocket } = require("./socket/socketHandler");

const User = require("./models/user");
const Restaurant = require("./models/restaurant");
const FoodItem = require("./models/fooditem");
const Menu = require("./models/menu");
const Order = require("./models/order");
const Notification = require("./models/notification");

let server;
let port;
let baseURL;
let socketURL;

const results = [];

function recordTest(name, passed, details = "") {
  results.push({ name, passed, details });
  const symbol = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${symbol} - ${name}${details ? ` (${details})` : ""}`);
}

async function runTests() {
  console.log("=================================================");
  console.log("  PHASE 4: REAL-TIME TRACKING & NOTIFICATIONS    ");
  console.log("=================================================\n");

  await mongoose.connect(process.env.DB_URI);
  console.log("Connected to MongoDB:", process.env.DB_URI);

  // Start HTTP server + Socket.IO on dynamic port
  server = http.createServer(app);
  initSocket(server);

  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port;
      baseURL = `http://127.0.0.1:${port}/api`;
      socketURL = `http://127.0.0.1:${port}`;
      console.log(`Server & Socket.IO active at ${socketURL}\n`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // 0. SEED TEST USERS & RESTAURANTS
    // -------------------------------------------------------------------------
    console.log("--- 0. Seeding Test Users & Restaurants ---");

    await User.deleteMany({
      email: {
        $in: [
          "p4_cust_a@foodapp.com",
          "p4_cust_b@foodapp.com",
          "p4_owner_a@foodapp.com",
          "p4_owner_b@foodapp.com",
          "p4_admin@foodapp.com",
        ],
      },
    });

    const custA = await User.create({
      name: "Customer A",
      email: "p4_cust_a@foodapp.com",
      phoneNumber: "9876500111",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "user",
    });

    const custB = await User.create({
      name: "Customer B",
      email: "p4_cust_b@foodapp.com",
      phoneNumber: "9876500222",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "user",
    });

    const ownerA = await User.create({
      name: "Owner A",
      email: "p4_owner_a@foodapp.com",
      phoneNumber: "9876500333",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "restaurant_owner",
    });

    const ownerB = await User.create({
      name: "Owner B",
      email: "p4_owner_b@foodapp.com",
      phoneNumber: "9876500444",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "restaurant_owner",
    });

    const admin = await User.create({
      name: "Admin User",
      email: "p4_admin@foodapp.com",
      phoneNumber: "9876500555",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "admin",
    });

    const tokenCustA = custA.getJWTToken();
    const tokenCustB = custB.getJWTToken();
    const tokenOwnerA = ownerA.getJWTToken();
    const tokenOwnerB = ownerB.getJWTToken();
    const tokenAdmin = admin.getJWTToken();

    const headersCustA = { Authorization: `Bearer ${tokenCustA}` };
    const headersCustB = { Authorization: `Bearer ${tokenCustB}` };
    const headersOwnerA = { Authorization: `Bearer ${tokenOwnerA}` };
    const headersOwnerB = { Authorization: `Bearer ${tokenOwnerB}` };
    const headersAdmin = { Authorization: `Bearer ${tokenAdmin}` };

    await Restaurant.deleteMany({
      name: { $in: ["P4 Spice Hub", "P4 Pizza Haven"] },
    });

    const restA = await Restaurant.create({
      name: "P4 Spice Hub",
      address: "101 Masala Road, Pune",
      owner: ownerA._id,
      isOpen: true,
      deliveryTime: 25,
      deliveryRadius: 10,
    });

    const menuA = await Menu.create({
      name: "P4 Spice Hub Menu",
      restaurant: restA._id,
    });

    const foodA = await FoodItem.create({
      name: "Butter Paneer",
      price: 250,
      description: "Creamy butter paneer curry",
      restaurant: restA._id,
      menu: menuA._id,
      image: [{ public_id: "def", url: "https://example.com/p.jpg" }],
      stock: 100,
    });

    const restB = await Restaurant.create({
      name: "P4 Pizza Haven",
      address: "202 Cheese Lane, Mumbai",
      owner: ownerB._id,
      isOpen: true,
      deliveryTime: 30,
      deliveryRadius: 10,
    });

    const menuB = await Menu.create({
      name: "P4 Pizza Haven Menu",
      restaurant: restB._id,
    });

    const foodB = await FoodItem.create({
      name: "BBQ Chicken Pizza",
      price: 399,
      description: "Smoky barbecue chicken pizza",
      restaurant: restB._id,
      menu: menuB._id,
      image: [{ public_id: "def", url: "https://example.com/pizza.jpg" }],
      stock: 100,
    });

    console.log("Seeded Customer A, Customer B, Owner A, Owner B, Admin, Restaurants A and B.\n");

    // -------------------------------------------------------------------------
    // TEST 1: Socket Authentication Tests
    // -------------------------------------------------------------------------
    // 1a: Invalid JWT connection rejected
    try {
      const invalidSocket = ClientIO(socketURL, {
        auth: { token: "invalid_bogus_token_123" },
        transports: ["websocket"],
      });
      const authErr = await new Promise((resolve) => {
        invalidSocket.on("connect_error", (err) => resolve(err.message));
        invalidSocket.on("connect", () => resolve("connected"));
      });
      invalidSocket.disconnect();
      const passed = authErr.includes("Authentication error");
      recordTest("1a. Invalid JWT socket connection is rejected", passed, authErr);
    } catch (e) {
      recordTest("1a. Invalid JWT socket connection is rejected", false, e.message);
    }

    // 1b: Expired JWT connection rejected
    try {
      const expiredToken = jwt.sign(
        { id: custA._id },
        process.env.JWT_SECRET,
        { expiresIn: "0s" } // immediately expired
      );
      const expiredSocket = ClientIO(socketURL, {
        auth: { token: expiredToken },
        transports: ["websocket"],
      });
      const authErr = await new Promise((resolve) => {
        expiredSocket.on("connect_error", (err) => resolve(err.message));
        expiredSocket.on("connect", () => resolve("connected"));
      });
      expiredSocket.disconnect();
      const passed = authErr.includes("Authentication error");
      recordTest("1b. Expired JWT socket connection is rejected", passed, authErr);
    } catch (e) {
      recordTest("1b. Expired JWT socket connection is rejected", false, e.message);
    }

    // 1c: Valid connection for Customer A, Customer B, Owner A, Owner B
    const clientCustA = ClientIO(socketURL, { auth: { token: tokenCustA }, transports: ["websocket"] });
    const clientCustB = ClientIO(socketURL, { auth: { token: tokenCustB }, transports: ["websocket"] });
    const clientOwnerA = ClientIO(socketURL, { auth: { token: tokenOwnerA }, transports: ["websocket"] });
    const clientOwnerB = ClientIO(socketURL, { auth: { token: tokenOwnerB }, transports: ["websocket"] });

    await Promise.all([
      new Promise((res) => clientCustA.on("connect", res)),
      new Promise((res) => clientCustB.on("connect", res)),
      new Promise((res) => clientOwnerA.on("connect", res)),
      new Promise((res) => clientOwnerB.on("connect", res)),
    ]);
    recordTest("1c. Valid authenticated users connect successfully", true);

    // -------------------------------------------------------------------------
    // TEST 2: Room Authorization Strategy
    // -------------------------------------------------------------------------
    // 2a: Owner A can join their own Restaurant room
    try {
      const joinRes = await new Promise((resolve) => {
        clientOwnerA.emit("join:restaurant", { restaurantId: restA._id.toString() }, resolve);
      });
      const passed = joinRes?.success === true && joinRes?.room === `restaurant:${restA._id}`;
      recordTest("2a. Owner A joins their own restaurant room successfully", passed, joinRes?.room);
    } catch (e) {
      recordTest("2a. Owner A joins their own restaurant room", false, e.message);
    }

    // 2b: Owner A CANNOT join Owner B's Restaurant room
    try {
      const joinBRes = await new Promise((resolve) => {
        clientOwnerA.emit("join:restaurant", { restaurantId: restB._id.toString() }, resolve);
      });
      const passed = joinBRes?.success === false && joinBRes?.message.includes("You do not own this restaurant");
      recordTest("2b. Owner A joining Owner B's restaurant room is rejected", passed, joinBRes?.message);
    } catch (e) {
      recordTest("2b. Owner A joining Owner B's restaurant room is rejected", false, e.message);
    }

    // 2c: Customer cannot join any restaurant room
    try {
      const custJoin = await new Promise((resolve) => {
        clientCustA.emit("join:restaurant", { restaurantId: restA._id.toString() }, resolve);
      });
      const passed = custJoin?.success === false && custJoin?.message.includes("only restaurant owners");
      recordTest("2c. Normal customer cannot join restaurant rooms", passed, custJoin?.message);
    } catch (e) {
      recordTest("2c. Normal customer cannot join restaurant rooms", false, e.message);
    }

    // Join Owner B to Restaurant B room
    await new Promise((resolve) => {
      clientOwnerB.emit("join:restaurant", { restaurantId: restB._id.toString() }, resolve);
    });

    // -------------------------------------------------------------------------
    // TEST 3: Real-Time Order Events & Strict Isolation
    // -------------------------------------------------------------------------
    // Customer A places Order A with Restaurant A
    const orderReceivedCustA = [];
    const orderReceivedCustB = [];
    const orderReceivedOwnerA = [];
    const orderReceivedOwnerB = [];

    clientCustA.on("order:created", (p) => orderReceivedCustA.push(p));
    clientCustB.on("order:created", (p) => orderReceivedCustB.push(p));
    clientOwnerA.on("order:created", (p) => orderReceivedOwnerA.push(p));
    clientOwnerB.on("order:created", (p) => orderReceivedOwnerB.push(p));

    const orderA = await Order.create({
      restaurant: restA._id,
      user: custA._id,
      orderItems: [{ name: "Butter Paneer", quantity: 1, price: 250, image: "img", fooditem: foodA._id }],
      deliveryInfo: { address: "Flat 101", city: "Pune", phoneNo: "9876500111", postalCode: "411005", country: "IN" },
      itemsPrice: 250,
      deliveryCharge: 30,
      finalTotal: 280,
      orderStatus: "Order Confirmed",
    });

    // Trigger emitOrderLifecycleEvent
    const { emitOrderLifecycleEvent } = require("./socket/socketHandler");
    await emitOrderLifecycleEvent("order:created", orderA);

    // Wait a brief tick for socket broadcast
    await new Promise((r) => setTimeout(r, 200));

    // Check Customer A received, Customer B DID NOT
    const custAOk = orderReceivedCustA.some((p) => p.orderId === orderA._id.toString());
    const custBOk = !orderReceivedCustB.some((p) => p.orderId === orderA._id.toString());
    recordTest(
      "3a. Customer A receives order:created for Order A",
      custAOk,
      `Received: ${orderReceivedCustA.length}`
    );
    recordTest(
      "3b. Customer B NEVER receives Customer A's private order updates",
      custBOk,
      `Customer B received: ${orderReceivedCustB.length}`
    );

    // Check Owner A received, Owner B DID NOT
    const ownerAOk = orderReceivedOwnerA.some((p) => p.orderId === orderA._id.toString());
    const ownerBOk = !orderReceivedOwnerB.some((p) => p.orderId === orderA._id.toString());
    recordTest(
      "3c. Owner A receives incoming order for Restaurant A",
      ownerAOk,
      `Owner A received: ${orderReceivedOwnerA.length}`
    );
    recordTest(
      "3d. Owner B NEVER receives Owner A's restaurant orders",
      ownerBOk,
      `Owner B received: ${orderReceivedOwnerB.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Live Order Status Transitions (Preparing, Ready for Pickup, Delivered)
    // -------------------------------------------------------------------------
    const custAStatusEvents = [];
    const custBStatusEvents = [];
    clientCustA.on("order:status_updated", (p) => custAStatusEvents.push(p));
    clientCustB.on("order:status_updated", (p) => custBStatusEvents.push(p));

    // Owner A accepts order -> "Preparing"
    const resPrep = await axios.put(
      `${baseURL}/v1/owner/orders/${orderA._id}/status`,
      { newStatus: "Preparing" },
      { headers: headersOwnerA }
    );
    await new Promise((r) => setTimeout(r, 150));

    const prepReceived = custAStatusEvents.some(
      (e) => e.orderId === orderA._id.toString() && e.orderStatus === "Preparing"
    );
    recordTest(
      "4a. Status update 'Preparing' delivered to Customer A in real time",
      resPrep.status === 200 && prepReceived
    );

    // Owner A advances to "Ready for Pickup"
    const resReady = await axios.put(
      `${baseURL}/v1/owner/orders/${orderA._id}/status`,
      { newStatus: "Ready for Pickup" },
      { headers: headersOwnerA }
    );
    await new Promise((r) => setTimeout(r, 150));

    const readyReceived = custAStatusEvents.some(
      (e) => e.orderId === orderA._id.toString() && e.orderStatus === "Ready for Pickup"
    );
    recordTest(
      "4b. Status update 'Ready for Pickup' delivered to Customer A in real time",
      resReady.status === 200 && readyReceived
    );

    // Verify Customer B never received these status events
    recordTest(
      "4c. Customer B received 0 status events from Customer A's order",
      custBStatusEvents.length === 0,
      `Count: ${custBStatusEvents.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Order Rejection with Reason Real-Time Broadcast
    // -------------------------------------------------------------------------
    const orderToReject = await Order.create({
      restaurant: restA._id,
      user: custA._id,
      orderItems: [{ name: "Butter Paneer", quantity: 1, price: 250, image: "img", fooditem: foodA._id }],
      deliveryInfo: { address: "Room 10", city: "Pune", phoneNo: "9876500111", postalCode: "411005", country: "IN" },
      itemsPrice: 250,
      deliveryCharge: 30,
      finalTotal: 280,
      orderStatus: "Order Confirmed",
    });

    const resRej = await axios.put(
      `${baseURL}/v1/owner/orders/${orderToReject._id}/status`,
      { newStatus: "Rejected", reason: "Store kitchen closed for maintenance" },
      { headers: headersOwnerA }
    );
    await new Promise((r) => setTimeout(r, 150));

    const rejReceived = custAStatusEvents.some(
      (e) =>
        e.orderId === orderToReject._id.toString() &&
        e.orderStatus === "Rejected" &&
        e.reason === "Store kitchen closed for maintenance"
    );
    recordTest(
      "5. Order rejection with reason broadcasted in real time to customer",
      resRej.status === 200 && rejReceived
    );

    // -------------------------------------------------------------------------
    // TEST 6: Persistent Notification System APIs & Security
    // -------------------------------------------------------------------------
    // 6a: Customer A fetches their notifications
    const resNotifA = await axios.get(`${baseURL}/v1/notifications`, {
      headers: headersCustA,
    });
    const notifs = resNotifA.data.notifications;
    const passedNotifs =
      resNotifA.status === 200 &&
      Array.isArray(notifs) &&
      notifs.length > 0 &&
      notifs.every((n) => n.user.toString() === custA._id.toString());
    recordTest(
      "6a. Customer A fetches persisted notification history from MongoDB",
      passedNotifs,
      `Count: ${resNotifA.data.count}`
    );

    // 6b: Unread count endpoint
    const resCount = await axios.get(`${baseURL}/v1/notifications/unread-count`, {
      headers: headersCustA,
    });
    recordTest(
      "6b. GET /api/v1/notifications/unread-count returns accurate count",
      resCount.status === 200 && resCount.data.count >= 1,
      `Unread count: ${resCount.data.count}`
    );

    // 6c: Mark single notification as read
    const targetNotif = notifs[0];
    const resRead = await axios.put(
      `${baseURL}/v1/notifications/${targetNotif._id}/read`,
      {},
      { headers: headersCustA }
    );
    recordTest(
      "6c. PUT /api/v1/notifications/:id/read marks notification as read",
      resRead.status === 200 && resRead.data.notification.isRead === true
    );

    // 6d: Customer B attempts to mark Customer A's notification as read -> 403
    try {
      await axios.put(
        `${baseURL}/v1/notifications/${targetNotif._id}/read`,
        {},
        { headers: headersCustB }
      );
      recordTest("6d. Customer B modifying Customer A's notification is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      recordTest(
        "6d. Customer B modifying Customer A's notification returns 403 Forbidden",
        e.response?.status === 403
      );
    }

    // 6e: Customer B attempts to delete Customer A's notification -> 403
    try {
      await axios.delete(`${baseURL}/v1/notifications/${targetNotif._id}`, {
        headers: headersCustB,
      });
      recordTest("6e. Customer B deleting Customer A's notification is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      recordTest(
        "6e. Customer B deleting Customer A's notification returns 403 Forbidden",
        e.response?.status === 403
      );
    }

    // 6f: Customer A marks all notifications as read
    const resReadAll = await axios.put(
      `${baseURL}/v1/notifications/read-all`,
      {},
      { headers: headersCustA }
    );
    const unreadAfter = (
      await axios.get(`${baseURL}/v1/notifications/unread-count`, { headers: headersCustA })
    ).data.count;
    recordTest(
      "6f. PUT /api/v1/notifications/read-all clears all unread notifications",
      resReadAll.status === 200 && unreadAfter === 0
    );

    // 6g: Customer A deletes notification
    const resDel = await axios.delete(
      `${baseURL}/v1/notifications/${targetNotif._id}`,
      { headers: headersCustA }
    );
    recordTest(
      "6g. DELETE /api/v1/notifications/:id successfully removes notification",
      resDel.status === 200
    );

    // -------------------------------------------------------------------------
    // TEST 7: Logout & Re-login Socket Lifecycle
    // -------------------------------------------------------------------------
    // Disconnect Customer A
    clientCustA.disconnect();
    recordTest("7a. Logout cleanly disconnects socket", clientCustA.connected === false);

    // Re-login Customer A with fresh socket
    const freshCustASocket = ClientIO(socketURL, {
      auth: { token: tokenCustA },
      transports: ["websocket"],
    });
    await new Promise((res) => freshCustASocket.on("connect", res));
    recordTest("7b. Re-login connects fresh socket for Customer A", freshCustASocket.connected === true);
    freshCustASocket.disconnect();

    // -------------------------------------------------------------------------
    // TEST 8: Reconnection & REST State Consistency
    // -------------------------------------------------------------------------
    const resRestOrder = await axios.get(`${baseURL}/v1/orders/${orderA._id}`, {
      headers: headersCustA,
    });
    const passedConsistency =
      resRestOrder.status === 200 &&
      resRestOrder.data.order.orderStatus === "Ready for Pickup";
    recordTest(
      "8. REST API /orders/:id returns latest persisted status ('Ready for Pickup')",
      passedConsistency
    );

    // -------------------------------------------------------------------------
    // TEST 9: Regression Tests (COD, Search, Menus, Cancellation)
    // -------------------------------------------------------------------------
    // 9a: Customer food search works
    const resSearch = await axios.get(`${baseURL}/v1/foods/search?keyword=Paneer`);
    recordTest(
      "9a. Customer food search API continues working",
      resSearch.status === 200 && resSearch.data.foodItems?.length > 0
    );

    // 9b: Customer menu fetch works
    const resMenu = await axios.get(`${baseURL}/v1/restaurants/${restA._id}/menus`);
    recordTest("9b. Customer restaurant menu API continues working", resMenu.status === 200);

    // 9c: Customer order cancellation works
    const orderToCancel = await Order.create({
      restaurant: restA._id,
      user: custA._id,
      orderItems: [{ name: "Butter Paneer", quantity: 1, price: 250, image: "img", fooditem: foodA._id }],
      deliveryInfo: { address: "Room 10", city: "Pune", phoneNo: "9876500111", postalCode: "411005", country: "IN" },
      itemsPrice: 250,
      deliveryCharge: 30,
      finalTotal: 280,
      orderStatus: "Order Confirmed",
    });

    const resCancel = await axios.put(
      `${baseURL}/v1/orders/${orderToCancel._id}/status`,
      { orderStatus: "Cancelled", cancelReason: "Customer changed mind" },
      { headers: headersCustA }
    );
    recordTest(
      "9c. Customer can cancel their own order before dispatch",
      resCancel.status === 200 && resCancel.data.order.orderStatus === "Cancelled"
    );

    // Disconnect clients
    clientCustB.disconnect();
    clientOwnerA.disconnect();
    clientOwnerB.disconnect();

    // Clean up test database records
    console.log("\n--- Cleaning up test records ---");
    await Notification.deleteMany({
      user: { $in: [custA._id, custB._id, ownerA._id, ownerB._id, admin._id] },
    });
    await Order.deleteMany({ user: { $in: [custA._id, custB._id] } });
    await FoodItem.deleteMany({ restaurant: { $in: [restA._id, restB._id] } });
    await Menu.deleteMany({ restaurant: { $in: [restA._id, restB._id] } });
    await Restaurant.deleteMany({ _id: { $in: [restA._id, restB._id] } });
    await User.deleteMany({
      email: {
        $in: [
          "p4_cust_a@foodapp.com",
          "p4_cust_b@foodapp.com",
          "p4_owner_a@foodapp.com",
          "p4_owner_b@foodapp.com",
          "p4_admin@foodapp.com",
        ],
      },
    });
    console.log("Cleaned up test records successfully.");
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }

  console.log("\n=================================================");
  console.log("               TEST SUITE SUMMARY                ");
  console.log("=================================================");
  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log("=================================================\n");

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Fatal test execution error:", err);
  process.exit(1);
});

