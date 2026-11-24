const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, 'config/config.env') });

const app = require('./app');

async function runTests() {
  console.log("==========================================");
  console.log("  COMPREHENSIVE BACKEND VERIFICATION TEST ");
  console.log("==========================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  const axios = require('axios');
  const client = axios.create({ baseURL: baseUrl, validateStatus: () => true });

  let authToken = null;
  const testEmail = `tester_${Date.now()}@example.com`;

  const tests = [
    { name: "1. Health Check", run: () => client.get("/") },
    { name: "2. Get All Restaurants", run: () => client.get("/api/v1/restaurants") },
    { name: "3. Get Restaurant by ID", run: () => client.get("/api/v1/restaurants/66716cb0e1a78e67dc8c8dce") },
    { name: "4. Get Restaurant Menus", run: () => client.get("/api/v1/restaurants/66716cb0e1a78e67dc8c8dce/menus") },
    { name: "5. Search Food Items", run: () => client.get("/api/v1/foods/search") },
    { name: "6. Search Pizza Dishes", run: () => client.get("/api/v1/foods/search?keyword=pizza") },
    {
      name: "7. User Registration",
      run: () => client.post("/api/v1/users/register", {
        name: "Backend Tester",
        email: testEmail,
        password: "Password123!",
        confirmPassword: "Password123!",
        phoneNumber: "9876543210"
      })
    },
    {
      name: "8. User Login",
      run: () => client.post("/api/v1/users/login", {
        email: testEmail,
        password: "Password123!"
      })
    },
    {
      name: "9. Get Authenticated User (/me)",
      run: () => client.get("/api/v1/users/me", {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    },
    {
      name: "10. Notifications Unread Count",
      run: () => client.get("/api/v1/notifications/unread-count", {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    },
    {
      name: "11. Get User Cart",
      run: () => client.get("/api/v1/users/cart", {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    },
    {
      name: "12. Add Item to Cart",
      run: () => client.post("/api/v1/users/cart/add-to-cart", {
        foodItemId: "dish_1",
        restaurantId: "66716cb0e1a78e67dc8c8dce",
        quantity: 2
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    },
    {
      name: "13. Create New Order",
      run: () => client.post("/api/v1/eats/orders/new", {
        session_id: "mock_session_" + Date.now(),
        deliveryInfo: { address: "402 Hill Road", city: "Mumbai", postalCode: "400050", phoneNo: "9876543210" }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    },
    {
      name: "14. Get User Orders (/me/myOrders)",
      run: () => client.get("/api/v1/eats/orders/me/myOrders", {
        headers: { Authorization: `Bearer ${authToken}` }
      })
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const res = await t.run();
      const isSuccess = res.status >= 200 && res.status < 300;
      if (isSuccess) {
        passed++;
        console.log(`✅ [PASS] ${t.name} (Status: ${res.status})`);
        if (res.data && res.data.token) {
          authToken = res.data.token;
        }
      } else {
        failed++;
        console.log(`❌ [FAIL] ${t.name} (Status: ${res.status}) -> ${JSON.stringify(res.data).substring(0, 120)}`);
      }
    } catch (err) {
      failed++;
      console.error(`❌ [FAIL] ${t.name} -> Error: ${err.message}`);
    }
  }

  server.close();
  console.log("\n==========================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Test failed to run:", err);
  process.exit(1);
});
