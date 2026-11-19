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
    const { data } = await api.post("/v1/eats/orders/new", payload);
    dispatch(createOrderSuccess(data.order));
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
    const { data } = await api.get("/v1/eats/orders/me/myOrders");
    dispatch(myOrdersSuccess(data.orders));
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
    const { data } = await api.get(`/v1/eats/orders/${id}`);
    dispatch(orderDetailsSuccess(data.order));
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
