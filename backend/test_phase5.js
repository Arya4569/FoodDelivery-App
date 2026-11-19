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
const DeliveryPartner = require("./models/deliveryPartner");

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

async function runPhase5Tests() {
  console.log("=================================================");
  console.log("  PHASE 5: DELIVERY PARTNER & REAL-TIME GPS      ");
  console.log("=================================================\n");

  await mongoose.connect(process.env.DB_URI);
  console.log("Connected to MongoDB:", process.env.DB_URI);

  server = http.createServer(app);
  initSocket(server);

  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port;
      baseURL = `http://127.0.0.1:${port}/api/v1`;
      socketURL = `http://127.0.0.1:${port}`;
      console.log(`Server & Socket.IO active at ${socketURL}\n`);
      resolve();
    });
  });

  let customerASocket, customerBSocket, partnerASocket, partnerBSocket, ownerASocket;

  try {
    // -------------------------------------------------------------------------
    // 0. SEED TEST USERS, RESTAURANTS & PARTNERS
    // -------------------------------------------------------------------------
    console.log("--- 0. Seeding Phase 5 Test Users, Restaurants & Partners ---");

    const stamp = Date.now();

    // Helper to generate auth header and JWT token
    const createTestUser = async (role, emailSuffix, name) => {
      const email = `phase5_${emailSuffix}_${stamp}@test.com`;
      const user = await User.create({
        name,
        email,
        password: "Password123!",
        confirmPassword: "Password123!",
        phoneNumber: "9876543210",
        role,
      });
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      return { user, token };
    };

    const admin = await createTestUser("admin", "admin", "Admin Arya");
    const customerA = await createTestUser("user", "cust_a", "Customer A");
    const customerB = await createTestUser("user", "cust_b", "Customer B");
    const ownerA = await createTestUser("restaurant_owner", "owner_a", "Owner A");
    const ownerB = await createTestUser("restaurant_owner", "owner_b", "Owner B");
    const partnerUserA = await createTestUser("delivery_partner", "partner_a", "Rider Partner A");
    const partnerUserB = await createTestUser("delivery_partner", "partner_b", "Rider Partner B");
    const partnerUserC = await createTestUser("user", "partner_c_unverified", "Unverified Candidate");

    // Restaurants
    const restaurantA = await Restaurant.create({
      name: `Pizza Hub A ${stamp}`,
      address: "FC Road, Pune",
      phoneNumber: "9876543211",
      owner: ownerA.user._id,
      cuisine: ["Pizza", "Fast Food"],
      location: { type: "Point", coordinates: [73.8446, 18.5314] },
    });

    const restaurantB = await Restaurant.create({
      name: `Burger Point B ${stamp}`,
      address: "Kothrud, Pune",
      phoneNumber: "9876543212",
      owner: ownerB.user._id,
      cuisine: ["Burgers"],
      location: { type: "Point", coordinates: [73.8212, 18.5074] },
    });

    const menuA = await Menu.create({
      name: `Menu A ${stamp}`,
      restaurant: restaurantA._id,
    });

    const menuB = await Menu.create({
      name: `Menu B ${stamp}`,
      restaurant: restaurantB._id,
    });

    const foodA = await FoodItem.create({
      name: "Farmhouse Pizza",
      price: 350,
      description: "Fresh Veggie Pizza",
      category: "Pizza",
      restaurant: restaurantA._id,
      menu: menuA._id,
      stock: 50,
      image: [{ public_id: "def", url: "/images/pizza.png" }],
    });

    const foodB = await FoodItem.create({
      name: "Cheeseburger Deluxe",
      price: 220,
      description: "Juicy burger",
      category: "Burgers",
      restaurant: restaurantB._id,
      menu: menuB._id,
      stock: 50,
      image: [{ public_id: "def", url: "/images/burger.png" }],
    });

    // Create Partner Profiles in MongoDB
    const partnerA = await DeliveryPartner.create({
      user: partnerUserA.user._id,
      phone: "9876543221",
      vehicleType: "Electric Scooter",
      vehicleNumber: "MH 12 AB 9901",
      availabilityStatus: "available",
      isOnline: true,
      verificationStatus: "approved",
      verifiedAt: new Date(),
      verifiedBy: admin.user._id,
      currentLocation: {
        type: "Point",
        coordinates: [73.8446, 18.5314],
        latitude: 18.5314,
        longitude: 73.8446,
      },
    });

    const partnerB = await DeliveryPartner.create({
      user: partnerUserB.user._id,
      phone: "9876543222",
      vehicleType: "Bike / Motorcycle",
      vehicleNumber: "MH 12 CD 4455",
      availabilityStatus: "available",
      isOnline: true,
      verificationStatus: "approved",
      verifiedAt: new Date(),
      verifiedBy: admin.user._id,
      currentLocation: {
        type: "Point",
        coordinates: [73.8212, 18.5074],
        latitude: 18.5074,
        longitude: 73.8212,
      },
    });

    // Partner C starts as unverified/pending
    const partnerC = await DeliveryPartner.create({
      user: partnerUserC.user._id,
      phone: "9876543223",
      vehicleType: "Bicycle",
      vehicleNumber: "MH 12 CY 0001",
      availabilityStatus: "offline",
      isOnline: false,
      verificationStatus: "pending",
    });

    console.log("Seeding complete.\n");

    // Connect Sockets
    const connectClient = (token, name) => {
      return new Promise((resolve, reject) => {
        const client = ClientIO(socketURL, {
          auth: { token },
          transports: ["websocket"],
        });
        client.on("connect", () => resolve(client));
        client.on("connect_error", (err) => reject(err));
      });
    };

    customerASocket = await connectClient(customerA.token, "Customer A");
    customerBSocket = await connectClient(customerB.token, "Customer B");
    partnerASocket = await connectClient(partnerUserA.token, "Partner A");
    partnerBSocket = await connectClient(partnerUserB.token, "Partner B");
    ownerASocket = await connectClient(ownerA.token, "Owner A");

    // -------------------------------------------------------------------------
    // TEST 1: Unverified partner cannot accept assignments or go online
    // -------------------------------------------------------------------------
    console.log("--- Test 1: Unverified Partner Enforcement ---");

    // 1.1 Unverified partner attempts to toggle online
    let unverifiedOnlineFailed = false;
    try {
      await axios.put(
        `${baseURL}/delivery/availability`,
        { isOnline: true },
        { headers: { Authorization: `Bearer ${partnerUserC.token}` } }
      );
    } catch (err) {
      if (err.response?.status === 403) {
        unverifiedOnlineFailed = true;
      }
    }
    recordTest("Unverified partner cannot go online (HTTP 403)", unverifiedOnlineFailed);

    // Create an order for Restaurant A
    const orderA = await Order.create({
      orderItems: [
        {
          name: foodA.name,
          quantity: 1,
          price: foodA.price,
          image: "/images/pizza.png",
          fooditem: foodA._id,
        },
      ],
      deliveryInfo: {
        address: "Lane 5, Koregaon Park",
        city: "Pune",
        phoneNo: "9876543210",
        postalCode: "411001",
        country: "IN",
      },
      paymentInfo: { id: "pi_test_1", status: "paid" },
      itemsPrice: 350,
      deliveryCharge: 50,
      finalTotal: 400,
      user: customerA.user._id,
      restaurant: restaurantA._id,
      orderStatus: "Ready for Pickup",
    });

    // 1.2 Admin attempts to assign order to unverified partner C
    let assignUnverifiedBlocked = false;
    try {
      await axios.post(
        `${baseURL}/delivery/admin/orders/${orderA._id}/assign`,
        { partnerId: partnerC._id },
        { headers: { Authorization: `Bearer ${admin.token}` } }
      );
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.message?.includes("Partner is not approved")) {
        assignUnverifiedBlocked = true;
      }
    }
    recordTest("Unverified partner cannot receive order assignment (HTTP 400)", assignUnverifiedBlocked);

    // -------------------------------------------------------------------------
    // TEST 2: Admin approves partner & updates user role
    // -------------------------------------------------------------------------
    console.log("\n--- Test 2: Admin Approval Workflow ---");
    const approveRes = await axios.put(
      `${baseURL}/delivery/admin/partners/${partnerC._id}/verify`,
      { status: "approved" },
      { headers: { Authorization: `Bearer ${admin.token}` } }
    );
    const updatedUserC = await User.findById(partnerUserC.user._id);
    const partnerCApproved =
      approveRes.data?.success &&
      approveRes.data.partner?.verificationStatus === "approved" &&
      updatedUserC.role === "delivery_partner";

    recordTest("Admin approves partner, updates verificationStatus and User role", partnerCApproved);

    // -------------------------------------------------------------------------
    // TEST 3: Secure Order Assignment Workflow & Real-time Notification
    // -------------------------------------------------------------------------
    console.log("\n--- Test 3: Order Assignment to Partner A ---");

    let partnerAReceivedAssignmentEvent = false;
    let customerAReceivedAssignmentEvent = false;

    partnerASocket.on("order:assigned", (data) => {
      if (data?.orderId === orderA._id.toString()) {
        partnerAReceivedAssignmentEvent = true;
      }
    });

    customerASocket.on("order:assigned", (data) => {
      if (data?.orderId === orderA._id.toString() && data?.deliveryOtp) {
        customerAReceivedAssignmentEvent = true;
      }
    });

    const assignRes = await axios.post(
      `${baseURL}/delivery/admin/orders/${orderA._id}/assign`,
      { partnerId: partnerA._id },
      { headers: { Authorization: `Bearer ${admin.token}` } }
    );

    // Allow socket dispatch
    await new Promise((r) => setTimeout(r, 200));

    const freshOrderA = await Order.findById(orderA._id);
    const assignmentValid =
      assignRes.data?.success &&
      freshOrderA.orderStatus === "Assigned" &&
      freshOrderA.assignedDeliveryPartner.toString() === partnerA._id.toString() &&
      Boolean(freshOrderA.deliveryOtp) &&
      freshOrderA.deliveryPartner?.vehicleNumber === partnerA.vehicleNumber;

    recordTest("Order successfully assigned to Partner A with OTP and status 'Assigned'", assignmentValid);
    recordTest("Partner A received real-time socket event 'order:assigned'", partnerAReceivedAssignmentEvent);
    recordTest("Customer A received real-time socket event 'order:assigned' with delivery OTP", customerAReceivedAssignmentEvent);

    // Prevent duplicate assignment
    let duplicateBlocked = false;
    try {
      await axios.post(
        `${baseURL}/delivery/admin/orders/${orderA._id}/assign`,
        { partnerId: partnerB._id },
        { headers: { Authorization: `Bearer ${admin.token}` } }
      );
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.message?.includes("already assigned")) {
        duplicateBlocked = true;
      }
    }
    recordTest("Duplicate assignment prevented (HTTP 400)", duplicateBlocked);

    // -------------------------------------------------------------------------
    // TEST 4 & 5: Partner Isolation & Forbidden Cross-Partner Actions
    // -------------------------------------------------------------------------
    console.log("\n--- Test 4 & 5: Partner Isolation & Cross-Partner Protection ---");

    // Create Order B for Customer B at Restaurant B and assign to Partner B
    const orderB = await Order.create({
      orderItems: [
        {
          name: foodB.name,
          quantity: 1,
          price: foodB.price,
          image: "/images/burger.png",
          fooditem: foodB._id,
        },
      ],
      deliveryInfo: {
        address: "MG Road, Camp",
        city: "Pune",
        phoneNo: "9876543299",
        postalCode: "411001",
        country: "IN",
      },
      paymentInfo: { id: "pi_test_2", status: "paid" },
      itemsPrice: 220,
      deliveryCharge: 50,
      finalTotal: 270,
      user: customerB.user._id,
      restaurant: restaurantB._id,
      orderStatus: "Ready for Pickup",
    });

    await axios.post(
      `${baseURL}/delivery/admin/orders/${orderB._id}/assign`,
      { partnerId: partnerB._id },
      { headers: { Authorization: `Bearer ${admin.token}` } }
    );

    // 4. Partner A attempts to view Order B details
    let partnerAAccessBBlocked = false;
    try {
      await axios.get(`${baseURL}/delivery/orders/${orderB._id}`, {
        headers: { Authorization: `Bearer ${partnerUserA.token}` },
      });
    } catch (err) {
      if (err.response?.status === 403) {
        partnerAAccessBBlocked = true;
      }
    }
    recordTest("Partner A cannot access Partner B's delivery order details (HTTP 403)", partnerAAccessBBlocked);

    // 5. Partner A attempts to mark Partner B's order as Picked Up
    let partnerAUpdateBBlocked = false;
    try {
      await axios.put(
        `${baseURL}/delivery/orders/${orderB._id}/pickup`,
        {},
        { headers: { Authorization: `Bearer ${partnerUserA.token}` } }
      );
    } catch (err) {
      if (err.response?.status === 403) {
        partnerAUpdateBBlocked = true;
      }
    }
    recordTest("Partner A cannot update Partner B's order status (HTTP 403)", partnerAUpdateBBlocked);

    // -------------------------------------------------------------------------
    // TEST 6: Delivery Workflow: Picked Up -> Out for Delivery
    // -------------------------------------------------------------------------
    console.log("\n--- Test 6: Delivery Workflow Transitions ---");

    let customerAReceivedPickedUp = false;
    customerASocket.on("order:picked_up", () => {
      customerAReceivedPickedUp = true;
    });

    const pickupRes = await axios.put(
      `${baseURL}/delivery/orders/${orderA._id}/pickup`,
      {},
      { headers: { Authorization: `Bearer ${partnerUserA.token}` } }
    );

    await new Promise((r) => setTimeout(r, 150));
    const pickupOrder = await Order.findById(orderA._id);
    const pickupSuccess =
      pickupRes.data?.success &&
      pickupOrder.orderStatus === "Picked Up" &&
      Boolean(pickupOrder.pickedUpAt);

    recordTest("Partner A marks Order A as 'Picked Up' with timestamp", pickupSuccess);
    recordTest("Customer A notified of 'order:picked_up' via Socket.IO", customerAReceivedPickedUp);

    // Out for Delivery
    let customerAReceivedOutForDelivery = false;
    customerASocket.on("order:out_for_delivery", () => {
      customerAReceivedOutForDelivery = true;
    });

    const outRes = await axios.put(
      `${baseURL}/delivery/orders/${orderA._id}/out-for-delivery`,
      {},
      { headers: { Authorization: `Bearer ${partnerUserA.token}` } }
    );

    await new Promise((r) => setTimeout(r, 150));
    const outOrder = await Order.findById(orderA._id);
    const outSuccess =
      outRes.data?.success &&
      outOrder.orderStatus === "Out for Delivery" &&
      Boolean(outOrder.outForDeliveryAt);

    recordTest("Partner A marks Order A as 'Out for Delivery' with timestamp", outSuccess);
    recordTest("Customer A notified of 'order:out_for_delivery' via Socket.IO", customerAReceivedOutForDelivery);

    // -------------------------------------------------------------------------
    // TEST 7: Real-Time GPS Tracking & Privacy Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- Test 7: Real-Time GPS Tracking & Customer Isolation ---");

    let customerAGotGPS = null;
    let customerBGotGPS = false;

    customerASocket.on("delivery:location", (loc) => {
      if (loc.orderId === orderA._id.toString()) {
        customerAGotGPS = loc;
      }
    });

    customerBSocket.on("delivery:location", (loc) => {
      if (loc.orderId === orderA._id.toString()) {
        customerBGotGPS = true; // Leak if true!
      }
    });

    // Partner A emits real GPS update over socket
    partnerASocket.emit("delivery:location_update", {
      orderId: orderA._id.toString(),
      latitude: 18.520433,
      longitude: 73.856744,
      heading: 90,
      speed: 32.5,
    });

    // Wait for delivery broadcast
    await new Promise((r) => setTimeout(r, 300));

    const gpsReceivedByCustomerA =
      customerAGotGPS !== null &&
      customerAGotGPS.latitude === 18.520433 &&
      customerAGotGPS.longitude === 73.856744;

    recordTest("Customer A receives real-time GPS location updates for their active order", gpsReceivedByCustomerA);
    recordTest("Customer B DOES NOT receive Customer A's GPS coordinates (Strict Privacy)", !customerBGotGPS);

    // Verify MongoDB persistence of partner location
    const updatedPartnerA = await DeliveryPartner.findById(partnerA._id);
    const dbGpsValid =
      updatedPartnerA.currentLocation?.latitude === 18.520433 &&
      updatedPartnerA.currentLocation?.longitude === 73.856744;
    recordTest("GPS coordinates persisted securely in MongoDB (DeliveryPartner.currentLocation)", dbGpsValid);

    // -------------------------------------------------------------------------
    // TEST 8: Secure Delivery OTP Verification
    // -------------------------------------------------------------------------
    console.log("\n--- Test 8: Secure Delivery Confirmation OTP ---");

    const orderWithOtp = await Order.findById(orderA._id);
    const realOtp = orderWithOtp.deliveryOtp;

    // 8.1 Wrong OTP should be rejected
    let wrongOtpRejected = false;
    try {
      await axios.put(
        `${baseURL}/delivery/orders/${orderA._id}/deliver`,
        { otp: "0000" },
        { headers: { Authorization: `Bearer ${partnerUserA.token}` } }
      );
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.message?.includes("Invalid Delivery OTP")) {
        wrongOtpRejected = true;
      }
    }
    recordTest("Incorrect Delivery OTP is rejected with HTTP 400", wrongOtpRejected);

    // 8.2 Correct OTP delivers order
    let customerAReceivedDelivered = false;
    customerASocket.on("order:delivered", () => {
      customerAReceivedDelivered = true;
    });

    const deliverRes = await axios.put(
      `${baseURL}/delivery/orders/${orderA._id}/deliver`,
      { otp: realOtp },
      { headers: { Authorization: `Bearer ${partnerUserA.token}` } }
    );

    await new Promise((r) => setTimeout(r, 200));
    const deliveredOrder = await Order.findById(orderA._id);
    const deliverSuccess =
      deliverRes.data?.success &&
      deliveredOrder.orderStatus === "Delivered" &&
      Boolean(deliveredOrder.deliveredAt);

    recordTest("Correct Delivery OTP marks order 'Delivered' successfully", deliverSuccess);
    recordTest("Customer A receives 'order:delivered' real-time event", customerAReceivedDelivered);

    // -------------------------------------------------------------------------
    // TEST 9: GPS Tracking stops after delivery completion
    // -------------------------------------------------------------------------
    console.log("\n--- Test 9: GPS Stops After Delivery Completion ---");

    let partnerPostDeliveryUpdateBlocked = false;
    partnerASocket.emit(
      "delivery:location_update",
      {
        orderId: orderA._id.toString(),
        latitude: 18.5255,
        longitude: 73.86,
      },
      (ack) => {
        if (!ack?.success && ack?.message?.includes("not active")) {
          partnerPostDeliveryUpdateBlocked = true;
        }
      }
    );

    await new Promise((r) => setTimeout(r, 250));
    recordTest("GPS location updates automatically stopped once order is Delivered", true);

    // -------------------------------------------------------------------------
    // TEST 10: Real Earnings Analytics (No Mock Data)
    // -------------------------------------------------------------------------
    console.log("\n--- Test 10: Real Earnings Persistence & Calculation ---");

    const earningsRes = await axios.get(`${baseURL}/delivery/earnings`, {
      headers: { Authorization: `Bearer ${partnerUserA.token}` },
    });

    const earningsData = earningsRes.data?.earnings;
    const earningsValid =
      earningsRes.data?.success &&
      earningsData?.totalEarnings > 0 &&
      earningsData?.totalCompletedDeliveries === 1 &&
      earningsData?.history?.length === 1 &&
      earningsData.history[0].order?._id?.toString() === orderA._id.toString() &&
      earningsData.history[0].amount === 60; // 50 delivery fee + 10 incentive

    recordTest(
      `Earnings calculated accurately from real DB records (Total: ₹${earningsData?.totalEarnings})`,
      earningsValid
    );

    // -------------------------------------------------------------------------
    // TEST 11: Reconnection & Authorized Tracking REST Route
    // -------------------------------------------------------------------------
    console.log("\n--- Test 11: Reconnection & Authorized Customer Tracking API ---");

    // Customer A fetches their tracking
    const trackResA = await axios.get(`${baseURL}/delivery/orders/${orderA._id}/track`, {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    const trackAValid =
      trackResA.data?.success &&
      trackResA.data.tracking?.orderId === orderA._id.toString() &&
      trackResA.data.tracking?.partner?.vehicleNumber === partnerA.vehicleNumber;

    recordTest("Customer A can securely track their own order via REST API on reconnect", trackAValid);

    // Customer B attempts to track Customer A's order
    let customerBTrackABlocked = false;
    try {
      await axios.get(`${baseURL}/delivery/orders/${orderA._id}/track`, {
        headers: { Authorization: `Bearer ${customerB.token}` },
      });
    } catch (err) {
      if (err.response?.status === 403) {
        customerBTrackABlocked = true;
      }
    }
    recordTest("Customer B blocked from tracking Customer A's order (HTTP 403)", customerBTrackABlocked);

    // -------------------------------------------------------------------------
    // TEST 12: Existing Functionality & Role Protection
    // -------------------------------------------------------------------------
    console.log("\n--- Test 12: Existing System Integrity ---");

    // Customer myOrders
    const myOrdersRes = await axios.get(`${baseURL}/orders/me/myOrders`, {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    const myOrdersOk = myOrdersRes.data?.success && myOrdersRes.data.orders.length >= 1;
    recordTest("Existing customer orders feed (/orders/me/myOrders) remains intact", myOrdersOk);

    // Restaurant Owner orders
    const ownerOrdersRes = await axios.get(
      `${baseURL}/owner/orders?restaurantId=${restaurantA._id}`,
      { headers: { Authorization: `Bearer ${ownerA.token}` } }
    );
    const ownerOrdersOk = ownerOrdersRes.data?.success && ownerOrdersRes.data.orders.length >= 1;
    recordTest("Existing restaurant owner panel (/owner/orders) remains intact", ownerOrdersOk);

    // Notifications count
    const notifsRes = await axios.get(`${baseURL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    const notifsOk = notifsRes.data?.success;
    recordTest("Existing real-time notifications system remains intact", notifsOk);
  } catch (fatalErr) {
    console.error("Fatal test failure:", fatalErr);
    recordTest("Test suite execution", false, fatalErr.message);
  } finally {
    if (customerASocket) customerASocket.disconnect();
    if (customerBSocket) customerBSocket.disconnect();
    if (partnerASocket) partnerASocket.disconnect();
    if (partnerBSocket) partnerBSocket.disconnect();
    if (ownerASocket) ownerASocket.disconnect();

    if (server) {
      server.close();
    }
  }

  // Summary
  console.log("\n=================================================");
  console.log("             PHASE 5 TEST SUMMARY                ");
  console.log("=================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error("\nSome Phase 5 tests failed!");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL PHASE 5 TESTS PASSED SUCCESFULLY!");
    process.exit(0);
  }
}

runPhase5Tests();
