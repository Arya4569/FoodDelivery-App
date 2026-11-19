const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "config/config.env") });

const mongoose = require("mongoose");
const axios = require("axios");
const app = require("./app");

const User = require("./models/user");
const Restaurant = require("./models/restaurant");
const FoodItem = require("./models/fooditem");
const Menu = require("./models/menu");
const Order = require("./models/order");

let server;
let baseURL;

const results = [];

function recordTest(name, passed, details = "") {
  results.push({ name, passed, details });
  const symbol = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${symbol} - ${name}${details ? ` (${details})` : ""}`);
}

async function runTests() {
  console.log("=================================================");
  console.log("   PHASE 3: RESTAURANT OWNER & MENU TEST SUITE   ");
  console.log("=================================================\n");

  await mongoose.connect(process.env.DB_URI);
  console.log("Connected to MongoDB:", process.env.DB_URI);

  // Start app on ephemeral port
  server = app.listen(0);
  const port = server.address().port;
  baseURL = `http://127.0.0.1:${port}/api`;
  console.log(`Test server running at ${baseURL}\n`);

  try {
    // -------------------------------------------------------------------------
    // 0. SEED TEST USERS & RESTAURANTS
    // -------------------------------------------------------------------------
    console.log("--- 0. Setting up test users & restaurants ---");

    // Clean up any previous test accounts
    await User.deleteMany({
      email: {
        $in: [
          "test_owner_a@foodapp.com",
          "test_owner_b@foodapp.com",
          "test_customer@foodapp.com",
          "test_admin@foodapp.com",
        ],
      },
    });

    const ownerA = await User.create({
      name: "Owner A (Spice Symphony)",
      email: "test_owner_a@foodapp.com",
      phoneNumber: "9876500001",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "restaurant_owner",
    });

    const ownerB = await User.create({
      name: "Owner B (Bella Italia)",
      email: "test_owner_b@foodapp.com",
      phoneNumber: "9876500002",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "restaurant_owner",
    });

    const customer = await User.create({
      name: "Customer Charlie",
      email: "test_customer@foodapp.com",
      phoneNumber: "9876500003",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "user",
    });

    const admin = await User.create({
      name: "Admin Alice",
      email: "test_admin@foodapp.com",
      phoneNumber: "9876500004",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "admin",
    });

    const tokenOwnerA = ownerA.getJWTToken();
    const tokenOwnerB = ownerB.getJWTToken();
    const tokenCustomer = customer.getJWTToken();
    const tokenAdmin = admin.getJWTToken();

    const headersA = { Authorization: `Bearer ${tokenOwnerA}` };
    const headersB = { Authorization: `Bearer ${tokenOwnerB}` };
    const headersCust = { Authorization: `Bearer ${tokenCustomer}` };
    const headersAdmin = { Authorization: `Bearer ${tokenAdmin}` };

    // Clean previous test restaurants
    await Restaurant.deleteMany({
      name: { $in: ["Test Restaurant A", "Test Restaurant B"] },
    });

    const restA = await Restaurant.create({
      name: "Test Restaurant A",
      address: "101 Curry Lane, Pune",
      description: "Authentic Indian Cuisine",
      phoneNumber: "9876500001",
      openingTime: "10:00",
      closingTime: "22:00",
      deliveryTime: 25,
      deliveryRadius: 8,
      isOpen: true,
      isVeg: true,
      owner: ownerA._id,
      location: { type: "Point", coordinates: [73.8567, 18.5204] },
    });

    const menuA = await Menu.create({
      name: "Test Restaurant A Menu",
      restaurant: restA._id,
    });

    const restB = await Restaurant.create({
      name: "Test Restaurant B",
      address: "202 Pizza Blvd, Mumbai",
      description: "Artisanal Italian Pizzas",
      phoneNumber: "9876500002",
      openingTime: "11:00",
      closingTime: "23:00",
      deliveryTime: 35,
      deliveryRadius: 12,
      isOpen: true,
      isVeg: false,
      owner: ownerB._id,
      location: { type: "Point", coordinates: [72.8777, 19.076] },
    });

    const menuB = await Menu.create({
      name: "Test Restaurant B Menu",
      restaurant: restB._id,
    });

    const foodB1 = await FoodItem.create({
      name: "Pizza Margherita",
      price: 349,
      description: "Fresh basil, mozzarella and tomatoes",
      category: "Pizza",
      spiceLevel: "Mild",
      isVeg: true,
      isAvailable: true,
      stock: 50,
      restaurant: restB._id,
      menu: menuB._id,
      image: [{ public_id: "pizza_1", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591" }],
    });

    console.log("Seeded Owner A, Owner B, Customer, Admin & Restaurants A and B.\n");

    // -------------------------------------------------------------------------
    // TEST 1: Owner A can access their own restaurant
    // -------------------------------------------------------------------------
    try {
      const res = await axios.get(`${baseURL}/v1/owner/restaurants`, {
        headers: headersA,
      });
      const hasRestA = res.data.restaurants.some((r) => r._id === restA._id.toString());
      const hasRestB = res.data.restaurants.some((r) => r._id === restB._id.toString());
      const passed = res.status === 200 && hasRestA && !hasRestB;
      recordTest("1. Owner A can view their own restaurants and not others", passed, `Returned ${res.data.count} restaurants`);
    } catch (e) {
      recordTest("1. Owner A can view their own restaurants and not others", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Owner A cannot view or modify Owner B's restaurant
    // -------------------------------------------------------------------------
    try {
      await axios.get(`${baseURL}/v1/owner/restaurant/${restB._id}`, {
        headers: headersA,
      });
      recordTest("2a. Owner A GET Owner B's restaurant is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 403;
      recordTest("2a. Owner A GET Owner B's restaurant returns 403 Forbidden", passed, `Status: ${e.response?.status}`);
    }

    try {
      await axios.put(
        `${baseURL}/v1/owner/restaurant/${restB._id}`,
        { name: "Hacked by Owner A" },
        { headers: headersA }
      );
      recordTest("2b. Owner A PUT Owner B's restaurant is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 403;
      recordTest("2b. Owner A PUT Owner B's restaurant returns 403 Forbidden", passed, `Status: ${e.response?.status}`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Owner A can update their own restaurant
    // -------------------------------------------------------------------------
    try {
      const res = await axios.put(
        `${baseURL}/v1/owner/restaurant/${restA._id}`,
        {
          name: "Test Restaurant A (Updated)",
          description: "Fresh spices daily",
          deliveryTime: 20,
          deliveryRadius: 15,
          isOpen: false,
        },
        { headers: headersA }
      );
      const passed =
        res.status === 200 &&
        res.data.restaurant.name === "Test Restaurant A (Updated)" &&
        res.data.restaurant.isOpen === false &&
        res.data.restaurant.deliveryRadius === 15;
      recordTest("3. Owner A can update their own restaurant parameters", passed);
    } catch (e) {
      recordTest("3. Owner A can update their own restaurant parameters", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Food CRUD: Owner A creates Food Item in Restaurant A
    // -------------------------------------------------------------------------
    let foodA1Id;
    try {
      const res = await axios.post(
        `${baseURL}/v1/owner/restaurant/${restA._id}/food`,
        {
          name: "Paneer Tikka Masala",
          price: 280,
          description: "Tandoori paneer cubes in spiced gravy",
          category: "Main Course",
          spiceLevel: "Spicy",
          isVeg: true,
          stock: 40,
        },
        { headers: headersA }
      );
      foodA1Id = res.data.foodItem?._id;
      const passed = res.status === 201 && foodA1Id && res.data.foodItem.price === 280;
      recordTest("4a. Owner A can add new Food Item to Restaurant A", passed, `ID: ${foodA1Id}`);
    } catch (e) {
      recordTest("4a. Owner A can add new Food Item to Restaurant A", false, e.message);
    }

    // Owner A updating Food Item A1
    try {
      const res = await axios.put(
        `${baseURL}/v1/owner/food/${foodA1Id}`,
        { price: 295, stock: 35, isAvailable: true },
        { headers: headersA }
      );
      const passed = res.status === 200 && res.data.foodItem.price === 295;
      recordTest("4b. Owner A can update their Food Item A1", passed);
    } catch (e) {
      recordTest("4b. Owner A can update their Food Item A1", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Owner A cannot create, edit or delete Owner B's Food Items
    // -------------------------------------------------------------------------
    try {
      await axios.post(
        `${baseURL}/v1/owner/restaurant/${restB._id}/food`,
        {
          name: "Malicious Food",
          price: 100,
          description: "Trying to add food to Restaurant B",
        },
        { headers: headersA }
      );
      recordTest("5a. Owner A adding food to Restaurant B is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 403;
      recordTest("5a. Owner A adding food to Restaurant B returns 403 Forbidden", passed);
    }

    try {
      await axios.put(
        `${baseURL}/v1/owner/food/${foodB1._id}`,
        { price: 10 },
        { headers: headersA }
      );
      recordTest("5b. Owner A updating Food Item B1 is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 403;
      recordTest("5b. Owner A updating Food Item B1 returns 403 Forbidden", passed);
    }

    try {
      await axios.delete(`${baseURL}/v1/owner/food/${foodB1._id}`, {
        headers: headersA,
      });
      recordTest("5c. Owner A deleting Food Item B1 is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 403;
      recordTest("5c. Owner A deleting Food Item B1 returns 403 Forbidden", passed);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Normal customer cannot access Owner APIs
    // -------------------------------------------------------------------------
    try {
      await axios.get(`${baseURL}/v1/owner/restaurants`, {
        headers: headersCust,
      });
      recordTest("6a. Customer accessing /owner/restaurants is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 403;
      recordTest("6a. Customer accessing /owner/restaurants returns 403 Forbidden", passed);
    }

    try {
      await axios.get(`${baseURL}/v1/owner/dashboard`, {
        headers: headersCust,
      });
      recordTest("6b. Customer accessing /owner/dashboard is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 403;
      recordTest("6b. Customer accessing /owner/dashboard returns 403 Forbidden", passed);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Unauthenticated request to owner APIs returns 401
    // -------------------------------------------------------------------------
    try {
      await axios.get(`${baseURL}/v1/owner/dashboard`);
      recordTest("7. Unauthenticated request to /owner/dashboard is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 401;
      recordTest("7. Unauthenticated request returns 401 Unauthorized", passed);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Customer cannot elevate role through profile update
    // -------------------------------------------------------------------------
    try {
      const res = await axios.put(
        `${baseURL}/v1/users/me`,
        { name: "Customer Charlie", role: "admin" },
        { headers: headersCust }
      );
      const updatedUser = await User.findById(customer._id);
      const passed = updatedUser.role === "user";
      recordTest("8. User cannot escalate role via profile update", passed, `Role remains: ${updatedUser.role}`);
    } catch (e) {
      recordTest("8. User cannot escalate role via profile update", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Orders Creation & Isolation
    // -------------------------------------------------------------------------
    // Create an order for Restaurant A
    const orderA = await Order.create({
      restaurant: restA._id,
      user: customer._id,
      orderItems: [
        {
          name: "Paneer Tikka Masala",
          quantity: 2,
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
          price: 295,
          fooditem: foodA1Id,
        },
      ],
      deliveryInfo: {
        address: "Flat 4B, Hill View",
        city: "Pune",
        phoneNo: "9876500003",
        postalCode: "411005",
        country: "IN",
      },
      paymentInfo: { id: "pi_test_a", status: "paid" },
      itemsPrice: 590,
      deliveryCharge: 30,
      finalTotal: 620,
      orderStatus: "Order Confirmed",
    });

    // Create an order for Restaurant B
    const orderB = await Order.create({
      restaurant: restB._id,
      user: customer._id,
      orderItems: [
        {
          name: "Pizza Margherita",
          quantity: 1,
          image: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
          price: 349,
          fooditem: foodB1._id,
        },
      ],
      deliveryInfo: {
        address: "Room 12, Ocean View",
        city: "Mumbai",
        phoneNo: "9876500003",
        postalCode: "400001",
        country: "IN",
      },
      paymentInfo: { id: "pi_test_b", status: "paid" },
      itemsPrice: 349,
      deliveryCharge: 40,
      finalTotal: 389,
      orderStatus: "Order Confirmed",
    });

    // Owner A checks orders: Must only see Order A, never Order B
    try {
      const res = await axios.get(`${baseURL}/v1/owner/orders`, {
        headers: headersA,
      });
      const orderIds = res.data.orders.map((o) => o._id);
      const hasOrderA = orderIds.includes(orderA._id.toString());
      const hasOrderB = orderIds.includes(orderB._id.toString());
      const passed = res.status === 200 && hasOrderA && !hasOrderB;
      recordTest("9. Owner A order list is strictly isolated (sees Order A, NOT Order B)", passed, `Count: ${res.data.count}`);
    } catch (e) {
      recordTest("9. Owner A order list is strictly isolated", false, e.message);
    }

    // Owner A attempting to modify Order B's status
    try {
      await axios.put(
        `${baseURL}/v1/owner/orders/${orderB._id}/status`,
        { newStatus: "Preparing" },
        { headers: headersA }
      );
      recordTest("10. Owner A modifying Order B is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 403;
      recordTest("10. Owner A modifying Order B returns 403 Forbidden", passed);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Valid Order State Transitions
    // -------------------------------------------------------------------------
    // 11a: Owner A accepts Order A: "Order Confirmed" -> "Preparing"
    try {
      const res = await axios.put(
        `${baseURL}/v1/owner/orders/${orderA._id}/status`,
        { newStatus: "Preparing" },
        { headers: headersA }
      );
      const passed = res.status === 200 && res.data.order.orderStatus === "Preparing";
      recordTest("11a. Owner A accepts order ('Order Confirmed' -> 'Preparing')", passed);
    } catch (e) {
      recordTest("11a. Owner A accepts order", false, e.message);
    }

    // 11b: Owner A advances to "Ready for Pickup"
    try {
      const res = await axios.put(
        `${baseURL}/v1/owner/orders/${orderA._id}/status`,
        { newStatus: "Ready for Pickup" },
        { headers: headersA }
      );
      const passed = res.status === 200 && res.data.order.orderStatus === "Ready for Pickup";
      recordTest("11b. Owner A marks order 'Ready for Pickup'", passed);
    } catch (e) {
      recordTest("11b. Owner A marks order 'Ready for Pickup'", false, e.message);
    }

    // 11c: Owner A attempting to mark as "Delivered" -> Must be FORBIDDEN
    try {
      await axios.put(
        `${baseURL}/v1/owner/orders/${orderA._id}/status`,
        { newStatus: "Delivered" },
        { headers: headersA }
      );
      recordTest("11c. Owner A marking order as 'Delivered' is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 403;
      recordTest("11c. Owner A marking order as 'Delivered' returns 403 Forbidden", passed, e.response?.data?.message);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Order Rejection with Mandatory Reason & Stock Restoration
    // -------------------------------------------------------------------------
    // Create an order to reject
    const orderToReject = await Order.create({
      restaurant: restA._id,
      user: customer._id,
      orderItems: [
        {
          name: "Paneer Tikka Masala",
          quantity: 3,
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
          price: 295,
          fooditem: foodA1Id,
        },
      ],
      deliveryInfo: {
        address: "7th Street",
        city: "Pune",
        phoneNo: "9876500003",
        postalCode: "411005",
        country: "IN",
      },
      paymentInfo: { id: "pi_rej", status: "paid" },
      itemsPrice: 885,
      deliveryCharge: 30,
      finalTotal: 915,
      orderStatus: "Order Confirmed",
    });

    const stockWhileOrdered = (await FoodItem.findById(foodA1Id)).stock;

    // 12a: Reject without reason -> 400 Bad Request
    try {
      await axios.put(
        `${baseURL}/v1/owner/orders/${orderToReject._id}/status`,
        { newStatus: "Rejected" },
        { headers: headersA }
      );
      recordTest("12a. Rejection without reason is blocked", false, "Allowed unexpectedly");
    } catch (e) {
      const passed = e.response?.status === 400;
      recordTest("12a. Rejection without reason returns 400 Bad Request", passed);
    }

    // 12b: Reject with reason -> 200 and stock restored
    try {
      const res = await axios.put(
        `${baseURL}/v1/owner/orders/${orderToReject._id}/status`,
        { newStatus: "Rejected", reason: "Kitchen out of paneer today" },
        { headers: headersA }
      );
      const stockAfter = (await FoodItem.findById(foodA1Id)).stock;
      const passed =
        res.status === 200 &&
        res.data.order.orderStatus === "Rejected" &&
        res.data.order.cancelReason === "Kitchen out of paneer today" &&
        stockAfter === stockWhileOrdered + 3;
      recordTest(
        "12b. Rejection with reason succeeds and restores inventory stock (+3 units)",
        passed,
        `Stock: ${stockWhileOrdered} -> ${stockAfter}`
      );
    } catch (e) {
      recordTest("12b. Rejection with reason succeeds", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 13: Dashboard Statistics API returns accurate DB calculations
    // -------------------------------------------------------------------------
    try {
      const res = await axios.get(`${baseURL}/v1/owner/dashboard?restaurantId=${restA._id}`, {
        headers: headersA,
      });
      const stats = res.data.stats;
      const passed =
        res.status === 200 &&
        stats.totalOrders >= 2 &&
        stats.cancelledOrders >= 1 &&
        stats.topSellingItems.length > 0 &&
        stats.totalDishes >= 1;
      recordTest(
        "13. Owner Dashboard returns real DB calculations (orders, cancelled, top dishes)",
        passed,
        `Orders: ${stats.totalOrders}, Revenue: ₹${stats.totalRevenue}, Cancelled: ${stats.cancelledOrders}`
      );
    } catch (e) {
      recordTest("13. Owner Dashboard returns real DB calculations", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 14: Admin can access management APIs
    // -------------------------------------------------------------------------
    try {
      const res = await axios.get(`${baseURL}/v1/owner/restaurants`, {
        headers: headersAdmin,
      });
      const passed = res.status === 200 && res.data.restaurants.length >= 2;
      recordTest("14. Admin can access management APIs and view all restaurants", passed, `Count: ${res.data.count}`);
    } catch (e) {
      recordTest("14. Admin can access management APIs", false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 15: Customer Regression Tests
    // -------------------------------------------------------------------------
    try {
      const resFoods = await axios.get(`${baseURL}/v1/foods/search?keyword=Paneer`);
      const passedFoods = resFoods.status === 200 && Array.isArray(resFoods.data.foodItems);
      recordTest("15a. Customer food search API continues working", passedFoods, `Found: ${resFoods.data.count}`);
    } catch (e) {
      recordTest("15a. Customer food search API continues working", false, e.message);
    }

    try {
      const resMenu = await axios.get(`${baseURL}/v1/restaurants/${restA._id}/menus`);
      const passedMenu = resMenu.status === 200 && resMenu.data.success;
      recordTest("15b. Customer restaurant menu API continues working", passedMenu);
    } catch (e) {
      recordTest("15b. Customer restaurant menu API continues working", false, e.message);
    }

    try {
      const resOrders = await axios.get(`${baseURL}/v1/eats/orders/me/myOrders`, {
        headers: headersCust,
      });
      const passedOrders = resOrders.status === 200 && Array.isArray(resOrders.data.orders);
      recordTest("15c. Customer order history (/eats/orders/me/myOrders) continues working", passedOrders, `Orders: ${resOrders.data.orders.length}`);
    } catch (e) {
      recordTest("15c. Customer order history continues working", false, e.message);
    }

    // Customer cancellation rule check: Customer cancelling their own confirmed order
    try {
      const customerOrder = await Order.create({
        restaurant: restA._id,
        user: customer._id,
        orderItems: [
          {
            name: "Paneer Tikka Masala",
            quantity: 1,
            image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
            price: 295,
            fooditem: foodA1Id,
          },
        ],
        deliveryInfo: {
          address: "Room 10",
          city: "Pune",
          phoneNo: "9876500003",
          postalCode: "411005",
          country: "IN",
        },
        paymentInfo: { id: "pi_cust_cancel", status: "paid" },
        itemsPrice: 295,
        deliveryCharge: 30,
        finalTotal: 325,
        orderStatus: "Order Confirmed",
      });

      const res = await axios.put(
        `${baseURL}/v1/orders/${customerOrder._id}/status`,
        { orderStatus: "Cancelled", cancelReason: "Changed mind" },
        { headers: headersCust }
      );
      const passed = res.status === 200 && res.data.order.orderStatus === "Cancelled";
      recordTest("15d. Customer can cancel their own order before dispatch", passed);
    } catch (e) {
      recordTest("15d. Customer can cancel their own order before dispatch", false, e.message);
    }

    // Clean up test data
    console.log("\n--- Cleaning up test records ---");
    await Order.deleteMany({ user: customer._id });
    await FoodItem.deleteMany({ restaurant: { $in: [restA._id, restB._id] } });
    await Menu.deleteMany({ restaurant: { $in: [restA._id, restB._id] } });
    await Restaurant.deleteMany({ _id: { $in: [restA._id, restB._id] } });
    await User.deleteMany({
      email: {
        $in: [
          "test_owner_a@foodapp.com",
          "test_owner_b@foodapp.com",
          "test_customer@foodapp.com",
          "test_admin@foodapp.com",
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
