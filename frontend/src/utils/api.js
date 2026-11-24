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
  // Strip baseURL or leading /api /v1
  const cleanPath = rawUrl
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/?api\/?/, '')
    .replace(/^\/?v1\/?/, '')
    .split('?')[0];

  let responseData = { success: true };

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
  } else if (cleanPath === 'foods/search') {
    const items = getFilteredFoodItems(config.params || {});
    responseData = {
      foodItems: items,
      count: items.length,
    };
  } else if (cleanPath === 'users/register') {
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
    const saved = localStorage.getItem('demo_user');
    const user = saved ? JSON.parse(saved) : {
      _id: 'demo_user_1',
      name: body.email ? body.email.split('@')[0] : 'Demo User',
      email: body.email || 'demo@fooddelivery.com',
      phoneNumber: '9876543210',
      role: 'user',
      avatar: { url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' },
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
  } else if (cleanPath === 'notifications/unread-count') {
    responseData = { count: 0 };
  } else if (cleanPath.startsWith('notifications')) {
    responseData = { notifications: [], unreadCount: 0 };
  } else if (cleanPath === 'eats/orders/new') {
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
    const cart = JSON.parse(localStorage.getItem('cartItems') || '[]');
    const newOrder = {
      _id: 'demo_order_' + Date.now(),
      orderItems: cart,
      deliveryInfo: body.deliveryInfo || { address: '123 Marine Drive', city: 'Mumbai', postalCode: '400001', phoneNo: '9876543210' },
      orderStatus: 'Order Placed',
      createdAt: new Date().toISOString(),
      finalTotal: cart.reduce((acc, i) => acc + (i.price || 0) * (i.quantity || 1), 0) || 299,
    };
    const existing = JSON.parse(localStorage.getItem('demo_orders') || '[]');
    existing.unshift(newOrder);
    localStorage.setItem('demo_orders', JSON.stringify(existing));
    responseData = { order: newOrder };
  } else if (cleanPath === 'eats/orders/me/myOrders') {
    const existing = JSON.parse(localStorage.getItem('demo_orders') || '[]');
    responseData = { orders: existing };
  } else if (cleanPath.startsWith('eats/orders/')) {
    const orderId = cleanPath.split('/')[2];
    const existing = JSON.parse(localStorage.getItem('demo_orders') || '[]');
    const found = existing.find(o => o._id === orderId) || {
      _id: orderId,
      orderItems: [],
      deliveryInfo: { address: '123 Marine Drive', city: 'Mumbai' },
      orderStatus: 'Order Placed',
      createdAt: new Date().toISOString(),
    };
    responseData = { order: found };
  } else if (cleanPath.startsWith('users/cart')) {
    responseData = { cart: [] };
  } else if (cleanPath.startsWith('users/wishlist')) {
    responseData = { wishlist: [] };
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
