import api from "../../utils/api";
import {
  createOrderRequest,
  createOrderSuccess,
  createOrderFail,
  myOrdersRequest,
  myOrdersSuccess,
  myOrdersFail,
  orderDetailsRequest,
  orderDetailsSuccess,
  orderDetailsFail,
  updateOrderSuccess,
} from "../slices/orderSlice";

// Create order after stripe payment
export const createOrder = (session_id, deliveryInfo) => async (dispatch) => {
  try {
    dispatch(createOrderRequest());
    const payload = { session_id };
    if (deliveryInfo) payload.deliveryInfo = deliveryInfo;
    let orderData = null;
    try {
      const { data } = await api.post("/v1/eats/orders/new", payload);
      orderData = data.order;
    } catch (apiError) {
      const status = apiError.response?.status;
      if (!apiError.response || status === 404 || status === 405) {
        console.warn("Backend offline, saving demo order locally.");
        orderData = {
          _id: "demo_order_" + Date.now(),
          orderItems: JSON.parse(localStorage.getItem("cartItems") || "[]"),
          deliveryInfo: deliveryInfo || { address: "123 Marine Drive", city: "Mumbai", postalCode: "400001", phoneNo: "9876543210" },
          orderStatus: "Order Placed",
          createdAt: new Date().toISOString(),
          finalTotal: 299
        };
        const existing = JSON.parse(localStorage.getItem("demo_orders") || "[]");
        existing.unshift(orderData);
        localStorage.setItem("demo_orders", JSON.stringify(existing));
      } else {
        throw apiError;
      }
    }
    dispatch(createOrderSuccess(orderData));
    sessionStorage.removeItem("pending_delivery_info");
  } catch (error) {
    dispatch(
      createOrderFail(
        error.response?.data?.message || error.message || "Failed to create order"
      )
    );
  }
};

// Fetch logged in user's orders
export const myOrders = () => async (dispatch) => {
  try {
    dispatch(myOrdersRequest());
    try {
      const { data } = await api.get("/v1/eats/orders/me/myOrders");
      dispatch(myOrdersSuccess(data.orders));
    } catch (apiError) {
      const status = apiError.response?.status;
      if (!apiError.response || status === 404 || status === 405) {
        console.warn("Backend orders API unavailable, loading local orders cache");
        const localOrders = JSON.parse(localStorage.getItem("demo_orders") || "[]");
        dispatch(myOrdersSuccess(localOrders));
        return;
      }
      throw apiError;
    }
  } catch (error) {
    dispatch(
      myOrdersFail(
        error.response?.data?.message || error.message || "Failed to fetch orders"
      )
    );
  }
};

// Get single order details
export const getOrderDetails = (id) => async (dispatch) => {
  try {
    dispatch(orderDetailsRequest());
    try {
      const { data } = await api.get(`/v1/eats/orders/${id}`);
      dispatch(orderDetailsSuccess(data.order));
    } catch (apiError) {
      const status = apiError.response?.status;
      if (!apiError.response || status === 404 || status === 405) {
        const existing = JSON.parse(localStorage.getItem("demo_orders") || "[]");
        const found = existing.find(o => o._id === id);
        if (found) {
          dispatch(orderDetailsSuccess(found));
          return;
        }
      }
      throw apiError;
    }
  } catch (error) {
    dispatch(
      orderDetailsFail(
        error.response?.data?.message || error.message || "Order not found"
      )
    );
  }
};

// Update order status (for simulation/demo)
export const updateOrderStatus = (id, orderStatus) => async (dispatch) => {
  try {
    const { data } = await api.put(`/v1/eats/orders/${id}/status`, {
      orderStatus,
    });
    dispatch(updateOrderSuccess(data.order));
  } catch (error) {
    console.error("Failed to update status", error);
  }
};
