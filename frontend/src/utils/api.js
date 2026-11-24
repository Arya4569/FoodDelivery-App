// Centralized API setup with Static Host (GitHub Pages) adapter
import axios from 'axios';
import qs from 'qs';
import {
  allRestaurants,
  allMenus,
  allFoodItems,
  getFilteredRestaurants,
  getFilteredFoodItems,
} from '../data/restaurantsData';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const baseURL = backendUrl ? `${backendUrl.replace(/\/$/, '')}/api` : '/api';
const isStaticHost =
  typeof window !== 'undefined' &&
  window.location.hostname.includes('github.io') &&
  !backendUrl;

// Helper to handle requests on static hosting without making failed HTTP requests
const handleStaticHostRequest = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const rawUrl = config.url || '';
  
  // Safely strip any domain, /api, /v1, and leading slashes
  let cleanPath = rawUrl.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  while (
    cleanPath.startsWith('/api') ||
    cleanPath.startsWith('api') ||
    cleanPath.startsWith('/v1') ||
    cleanPath.startsWith('v1') ||
    cleanPath.startsWith('/')
  ) {
    cleanPath = cleanPath.replace(/^\/?(?:api|v1)(?=\/|$)/, '').replace(/^\/+/, '');
  }

  let responseData = { success: true };

  // Parse request body safely
  let body = {};
  if (typeof config.data === 'string') {
    try {
      body = JSON.parse(config.data);
    } catch (e) {
      body = {};
    }
  } else if (config.data && typeof config.data === 'object') {
    body = config.data;
  }

  // 1. RESTAURANTS
  if (cleanPath === 'restaurants') {
    const keyword = config.params?.keyword || '';
    const restaurants = getFilteredRestaurants(keyword);
    responseData = {
      restaurant: restaurants,
      count: restaurants.length,
    };
  } else if (cleanPath.startsWith('restaurants/') && cleanPath.endsWith('/menus')) {
    const match = cleanPath.match(/^restaurants\/([^/]+)\/menus/);
    const rId = match ? match[1] : '';
    responseData = {
      data: allMenus[rId] || [
        {
          _id: `menu_${rId}`,
          name: "Recommended Specials",
          restaurant: rId,
          foodItems: allFoodItems.filter(f => (f.restaurant?._id || f.restaurant) === rId).slice(0, 4),
        },
      ],
    };
  } else if (cleanPath.startsWith('restaurants/')) {
    const rId = cleanPath.replace(/^restaurants\//, '');
    const found = allRestaurants.find(r => r._id === rId) || allRestaurants[0];
    responseData = {
      success: true,
      data: found,
      restaurant: found,
    };
  }

  // 2. FOODS SEARCH
  else if (cleanPath === 'foods/search') {
    const items = getFilteredFoodItems(config.params || {});
    responseData = {
      foodItems: items,
      count: items.length,
    };
  }

  // 3. USER AUTH
  else if (cleanPath === 'users/register') {
    const name = body.name || 'Demo Foodie';
    const email = body.email || 'demo@fooddelivery.com';
    const phoneNumber = body.phoneNumber || '9876543210';
    const user = {
      _id: 'demo_user_' + Date.now(),
      name,
      email,
      phoneNumber,
      role: 'user',
      avatar: { url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
      addresses: [
        {
          _id: 'addr_default',
          label: 'Home',
          addressLine: '402, Sunshine Hill Road',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411045',
          phoneNumber: phoneNumber,
          isDefault: true,
        }
      ],
      favoriteRestaurants: [],
      favoriteFoodItems: [],
    };
    const token = 'demo_jwt_token_' + Date.now();
    localStorage.setItem('token', token);
    localStorage.setItem('demo_user', JSON.stringify(user));
    responseData = {
      data: { user },
      token,
      message: 'Registration Successful (Demo Mode)',
    };
  } else if (cleanPath === 'users/login') {
    const saved = localStorage.getItem('demo_user');
    const user = saved ? JSON.parse(saved) : {
      _id: 'demo_user_1',
      name: body.email ? body.email.split('@')[0] : 'Demo User',
      email: body.email || 'demo@fooddelivery.com',
      phoneNumber: '9876543210',
      role: 'user',
      avatar: { url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
      addresses: [
        {
          _id: 'addr_default',
          label: 'Home',
          addressLine: '402, Sunshine Hill Road',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411045',
          phoneNumber: '9876543210',
          isDefault: true,
        }
      ],
      favoriteRestaurants: [],
      favoriteFoodItems: [],
    };
    const token = 'demo_jwt_token_' + Date.now();
    localStorage.setItem('token', token);
    localStorage.setItem('demo_user', JSON.stringify(user));
    responseData = {
      data: { user },
      token,
      message: 'Login Successful (Demo Mode)',
    };
  } else if (cleanPath === 'users/me') {
    const saved = localStorage.getItem('demo_user');
    const user = saved ? JSON.parse(saved) : {
      _id: 'demo_user_1',
      name: 'Demo Foodie',
      email: 'demo@fooddelivery.com',
      phoneNumber: '9876543210',
      role: 'user',
      avatar: { url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
      addresses: [],
      favoriteRestaurants: [],
      favoriteFoodItems: [],
    };
    responseData = {
      data: { user },
    };
  } else if (cleanPath === 'users/logout') {
    localStorage.removeItem('token');
    localStorage.removeItem('demo_user');
    responseData = {
      success: true,
      message: 'Logged out successfully',
    };
  }

  // 4. ADDRESSES
  else if (cleanPath.startsWith('users/addresses')) {
    const saved = localStorage.getItem('demo_user');
    let user = saved ? JSON.parse(saved) : { addresses: [] };
    user.addresses = user.addresses || [];

    if (method === 'post') {
      const newAddr = {
        _id: 'addr_' + Date.now(),
        label: body.label || 'Home',
        addressLine: body.addressLine || 'Main Street',
        city: body.city || 'Pune',
        state: body.state || 'Maharashtra',
        postalCode: body.postalCode || '411045',
        phoneNumber: body.phoneNumber || user.phoneNumber || '9876543210',
        isDefault: body.isDefault || user.addresses.length === 0,
      };
      user.addresses.push(newAddr);
      localStorage.setItem('demo_user', JSON.stringify(user));
      responseData = { success: true, addresses: user.addresses, address: newAddr };
    } else {
      responseData = { success: true, addresses: user.addresses };
    }
  }

  // 5. WISHLIST (PERSISTENT & INTERACTIVE)
  else if (cleanPath.startsWith('users/wishlist/restaurant/')) {
    const rId = cleanPath.split('/')[3];
    const saved = localStorage.getItem('demo_user');
    let user = saved ? JSON.parse(saved) : { favoriteRestaurants: [] };
    user.favoriteRestaurants = user.favoriteRestaurants || [];

    const existingIdx = user.favoriteRestaurants.findIndex(r => (r._id || r) === rId);
    if (existingIdx > -1) {
      user.favoriteRestaurants.splice(existingIdx, 1);
    } else {
      const restObj = allRestaurants.find(r => r._id === rId) || { _id: rId, name: 'Favorite Restaurant' };
      user.favoriteRestaurants.push(restObj);
    }
    localStorage.setItem('demo_user', JSON.stringify(user));
    responseData = {
      success: true,
      user,
      wishlist: {
        restaurants: user.favoriteRestaurants,
        foodItems: user.favoriteFoodItems || [],
      },
    };
  } else if (cleanPath.startsWith('users/wishlist/fooditem/')) {
    const fId = cleanPath.split('/')[3];
    const saved = localStorage.getItem('demo_user');
    let user = saved ? JSON.parse(saved) : { favoriteFoodItems: [] };
    user.favoriteFoodItems = user.favoriteFoodItems || [];

    const existingIdx = user.favoriteFoodItems.findIndex(f => (f._id || f) === fId);
    if (existingIdx > -1) {
      user.favoriteFoodItems.splice(existingIdx, 1);
    } else {
      const foodObj = allFoodItems.find(f => f._id === fId) || { _id: fId, name: 'Favorite Dish' };
      user.favoriteFoodItems.push(foodObj);
    }
    localStorage.setItem('demo_user', JSON.stringify(user));
    responseData = {
      success: true,
      user,
      wishlist: {
        restaurants: user.favoriteRestaurants || [],
        foodItems: user.favoriteFoodItems,
      },
    };
  } else if (cleanPath.startsWith('users/wishlist')) {
    const saved = localStorage.getItem('demo_user');
    const user = saved ? JSON.parse(saved) : {};
    responseData = {
      success: true,
      wishlist: {
        restaurants: user.favoriteRestaurants || [],
        foodItems: user.favoriteFoodItems || [],
      },
    };
  }

  // 6. CHECKOUT: PAYMENT & ORDERS
  else if (cleanPath === 'payment/process') {
    // Generate simulated payment success link for demo environment
    const redirectUrl = `${window.location.origin}${window.location.pathname}#/success?session_id=demo_session_${Date.now()}`;
    responseData = {
      success: true,
      url: redirectUrl,
    };
  } else if (cleanPath === 'eats/orders/cod' || cleanPath === 'eats/orders/new') {
    const cart = JSON.parse(localStorage.getItem('cartItems') || '[]');
    const newOrder = {
      _id: 'order_' + Date.now(),
      orderItems: cart.length > 0 ? cart : [
        {
          name: 'Cheese Burst Pizza & Fries',
          quantity: 1,
          price: body.finalTotal || 299,
          image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
        }
      ],
      deliveryInfo: body.deliveryInfo || { address: '402 Sunshine Hill Road', city: 'Pune', postalCode: '411045', phoneNo: '9876543210' },
      paymentInfo: { status: cleanPath.includes('cod') ? 'Cash on Delivery' : 'Paid (Demo)' },
      orderStatus: 'Order Confirmed',
      createdAt: new Date().toISOString(),
      finalTotal: body.finalTotal || 299,
      deliveryPartner: {
        name: 'Rahul Sharma',
        phoneNo: '+91 98765 43210',
        vehicleNumber: 'MH 12 AB 4567 (Electric Scooter)',
        rating: 4.9,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      },
    };
    const existing = JSON.parse(localStorage.getItem('demo_orders') || '[]');
    existing.unshift(newOrder);
    localStorage.setItem('demo_orders', JSON.stringify(existing));
    localStorage.removeItem('cartItems'); // clear cart on order
    responseData = {
      success: true,
      order: newOrder,
    };
  } else if (cleanPath === 'eats/orders/me/myOrders' || cleanPath === 'orders/me') {
    const existing = JSON.parse(localStorage.getItem('demo_orders') || '[]');
    responseData = {
      success: true,
      orders: existing,
    };
  } else if (cleanPath.startsWith('eats/orders/') && cleanPath.endsWith('/status')) {
    const orderId = cleanPath.split('/')[2];
    const existing = JSON.parse(localStorage.getItem('demo_orders') || '[]');
    const found = existing.find(o => o._id === orderId);
    if (found) {
      found.orderStatus = body.orderStatus || 'Delivered';
      localStorage.setItem('demo_orders', JSON.stringify(existing));
    }
    responseData = { success: true, order: found };
  } else if (cleanPath.startsWith('eats/orders/')) {
    const orderId = cleanPath.split('/')[2];
    const existing = JSON.parse(localStorage.getItem('demo_orders') || '[]');
    const found = existing.find(o => o._id === orderId) || {
      _id: orderId,
      orderItems: [
        {
          name: 'Cheese Burst Pizza',
          quantity: 1,
          price: 299,
          image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
        }
      ],
      deliveryInfo: { address: '402 Sunshine Hill Road', city: 'Pune' },
      orderStatus: 'Preparing',
      createdAt: new Date().toISOString(),
      finalTotal: 299,
    };
    responseData = { success: true, order: found };
  }

  // 7. AI FOODIE CHAT
  else if (cleanPath === 'ai/chat') {
    const msg = (body.message || '').toLowerCase();
    let reply = "I recommend checking out our top-rated restaurants: Domino's for cheesy pizzas, Mani's Dum Biryani for fragrant biryanis, and Burger King for crispy flame-grilled burgers!";

    if (msg.includes('pizza')) {
      reply = "🍕 For incredible pizzas, try Domino's Pizza (Peppy Paneer / Pepperoni) or La Pino'z Pizza (Monster slices)!";
    } else if (msg.includes('burger')) {
      reply = "🍔 For juicy burgers, check out Burger King's Whopper or McDonald's McSpicy!";
    } else if (msg.includes('biryani')) {
      reply = "🍚 Craving aromatic biryani? Mani's Dum Biryani, Behrouz Biryani and Meghana's Biryani have high ratings!";
    } else if (msg.includes('dessert') || msg.includes('sweet') || msg.includes('ice cream')) {
      reply = "🍨 Indulge your sweet tooth with The Belgian Waffle Co., Natural Ice Cream, or Baskin Robbins sundaes!";
    } else if (msg.includes('veg') || msg.includes('healthy')) {
      reply = "🥗 Pure veg favorites: Shiv Sagar for pav bhaji & dosas, and Punjab Grill for rich Dal Makhani!";
    } else if (msg.includes('300') || msg.includes('cheap') || msg.includes('under')) {
      reply = "💰 Under ₹300 picks: Faasos wraps, Wow! Momo, and Chai Point snack combos!";
    }

    responseData = {
      success: true,
      reply,
    };
  }

  // 8. DELIVERY PARTNER DASHBOARD & ADMIN
  else if (cleanPath === 'delivery/profile/me') {
    responseData = {
      success: true,
      deliveryPartner: {
        _id: 'partner_demo_1',
        name: 'Rahul Sharma',
        phoneNumber: '9876543210',
        vehicleType: 'Electric Scooter',
        vehicleNumber: 'MH 12 AB 4567',
        verificationStatus: 'approved',
        isOnline: true,
        availabilityStatus: 'Available',
        rating: 4.9,
        totalDeliveries: 142,
      },
    };
  } else if (cleanPath === 'delivery/availability') {
    responseData = {
      success: true,
      isOnline: body.isOnline !== undefined ? body.isOnline : true,
      availabilityStatus: body.isOnline ? 'Available' : 'Offline',
      message: `Status updated to ${body.isOnline ? 'Online' : 'Offline'}`,
    };
  } else if (cleanPath === 'delivery/register') {
    responseData = {
      success: true,
      message: 'Delivery partner registered successfully!',
      deliveryPartner: {
        _id: 'partner_' + Date.now(),
        name: 'Demo Partner',
        phoneNumber: body.phone || '9876543210',
        vehicleType: body.vehicleType || 'Bike / Motorcycle',
        vehicleNumber: body.vehicleNumber || 'MH 12 AB 1234',
        verificationStatus: 'approved',
        isOnline: true,
        rating: 5.0,
        totalDeliveries: 0,
      },
    };
  } else if (cleanPath.startsWith('delivery/orders/available')) {
    responseData = {
      success: true,
      orders: [
        {
          _id: 'ord_avail_1',
          restaurant: { name: "Domino's Pizza", address: "MG Road, Pune" },
          deliveryInfo: { address: "102 Koregaon Park", city: "Pune" },
          finalTotal: 480,
          orderStatus: "Ready for Pickup",
          distance: "2.4 km",
          estimatedEarnings: 65,
        },
        {
          _id: 'ord_avail_2',
          restaurant: { name: "Mani's Dum Biryani", address: "FC Road, Pune" },
          deliveryInfo: { address: "504 Shivaji Nagar", city: "Pune" },
          finalTotal: 620,
          orderStatus: "Ready for Pickup",
          distance: "3.1 km",
          estimatedEarnings: 80,
        }
      ],
    };
  } else if (cleanPath.startsWith('delivery/orders/my-deliveries') || cleanPath.startsWith('delivery/orders/assigned')) {
    responseData = {
      success: true,
      orders: [],
    };
  } else if (cleanPath.startsWith('delivery/orders/') && cleanPath.endsWith('/track')) {
    responseData = {
      success: true,
      tracking: {
        orderId: cleanPath.split('/')[2],
        status: 'Out for Delivery',
        partnerLocation: {
          latitude: 18.5204,
          longitude: 73.8567,
          heading: 45,
          speed: 28,
          updatedAt: new Date(),
        },
        deliveryOtp: '4589',
        deliveryPartner: {
          name: 'Rahul Sharma',
          phoneNo: '+91 98765 43210',
          rating: 4.9,
          vehicleNumber: 'MH 12 AB 4567 (Electric Scooter)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        },
      },
    };
  } else if (cleanPath.startsWith('delivery/orders/') && (cleanPath.endsWith('/pickup') || cleanPath.endsWith('/out-for-delivery') || cleanPath.endsWith('/deliver'))) {
    responseData = {
      success: true,
      message: 'Status updated successfully',
      earningsEarned: 65,
    };
  } else if (cleanPath === 'delivery/location') {
    responseData = {
      success: true,
      message: 'Location received',
    };
  } else if (cleanPath === 'delivery/admin/partners') {
    responseData = {
      success: true,
      partners: [
        {
          _id: 'partner_demo_1',
          name: 'Rahul Sharma',
          email: 'rahul.delivery@foodie.com',
          phoneNumber: '9876543210',
          vehicleType: 'Electric Scooter',
          vehicleNumber: 'MH 12 AB 4567',
          verificationStatus: 'approved',
          isOnline: true,
          totalDeliveries: 142,
        },
      ],
    };
  } else if (cleanPath.startsWith('delivery/admin/partners/') && cleanPath.endsWith('/verify')) {
    responseData = {
      success: true,
      message: `Partner status updated to ${body.status || 'approved'}`,
    };
  } else if (cleanPath.startsWith('delivery/admin/orders/') && cleanPath.endsWith('/assign')) {
    responseData = {
      success: true,
      message: 'Order successfully assigned to delivery partner',
    };
  } else if (cleanPath.startsWith('delivery/earnings')) {
    responseData = {
      success: true,
      earnings: {
        totalEarnings: 4200,
        pendingPayout: 650,
        completedPayout: 3550,
        totalCompletedDeliveries: 38,
        todayEarnings: 480,
        todayDeliveriesCount: 4,
        history: [
          {
            _id: 'earn_1',
            date: new Date().toISOString(),
            orderId: 'ord_101',
            amount: 120,
            restaurantName: "Domino's Pizza",
            status: 'Credited',
          },
          {
            _id: 'earn_2',
            date: new Date(Date.now() - 86400000).toISOString(),
            orderId: 'ord_102',
            amount: 140,
            restaurantName: "Mani's Dum Biryani",
            status: 'Credited',
          },
        ],
      },
    };
  }

  // 9. NOTIFICATIONS
  else if (cleanPath === 'notifications/unread-count') {
    responseData = { count: 0 };
  } else if (cleanPath.startsWith('notifications')) {
    responseData = { notifications: [], unreadCount: 0 };
  } else if (cleanPath.startsWith('users/cart')) {
    responseData = { cart: [] };
  }

  return {
    data: responseData,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
  };
};

const defaultAdapter = axios.getAdapter(axios.defaults.adapter);
const customAdapter = async (config) => {
  if (isStaticHost) {
    return handleStaticHostRequest(config);
  }
  return defaultAdapter(config);
};

const api = axios.create({
  baseURL,
  withCredentials: true,
  paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
  adapter: customAdapter,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
