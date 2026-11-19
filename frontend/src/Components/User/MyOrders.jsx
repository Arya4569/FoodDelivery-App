import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faClock,
  faLocationDot,
  faIndianRupeeSign,
  faMotorcycle,
  faRotateRight,
  faTimesCircle,
  faStar,
  faCheckCircle,
  faTruck,
  faUtensils,
  faArrowLeft,
  faSpinner,
  faReceipt,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../utils/api";
import { addItemToCart } from "../../redux/actions/cartActions";
import ReviewModal from "../ReviewModal";
import { toast } from "react-toastify";
import { useSocket } from "../../context/SocketContext";

const STATUS_BADGES = {
  "Order Confirmed": { bg: "bg-primary", text: "text-white", icon: faCheckCircle },
  "Preparing": { bg: "bg-warning", text: "text-dark", icon: faUtensils },
  "Picked Up": { bg: "bg-info", text: "text-dark", icon: faBagShopping },
  "Out for Delivery": { bg: "bg-primary", text: "text-white", icon: faTruck },
  "Delivered": { bg: "bg-success", text: "text-white", icon: faCheckCircle },
  "Cancelled": { bg: "bg-danger", text: "text-white", icon: faTimesCircle },
};

const MyOrders = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isAuthenticated, loading: userLoading } = useSelector(
    (state) => state.user || {}
  );
  const { socket, isConnected } = useSocket();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'active' | 'completed' | 'cancelled'
  const [reviewFoodItem, setReviewFoodItem] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  useEffect(() => {
    if (!userLoading && !isAuthenticated && !localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    fetchOrders();
  }, [isAuthenticated, userLoading, navigate]);

  // Real-time socket event listeners for customer orders
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleStatusUpdate = (payload) => {
      const incomingId = payload?.orderId || payload?.order?._id;
      const newStatus = payload?.orderStatus || payload?.order?.orderStatus;
      if (!incomingId || !newStatus) return;

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord._id === incomingId) {
            return {
              ...ord,
              orderStatus: newStatus,
              cancelReason: payload.reason || payload.order?.cancelReason || ord.cancelReason,
            };
          }
          return ord;
        })
      );
    };

    const handleNewOrder = (payload) => {
      if (payload?.order) {
        setOrders((prev) => {
          const exists = prev.some((o) => o._id === payload.order._id);
          if (exists) return prev;
          return [payload.order, ...prev];
        });
      }
    };

    socket.on("order:status_updated", handleStatusUpdate);
    socket.on("order:created", handleNewOrder);
    socket.on("order:cancelled", handleStatusUpdate);
    socket.on("order:delivered", handleStatusUpdate);

    return () => {
      socket.off("order:status_updated", handleStatusUpdate);
      socket.off("order:created", handleNewOrder);
      socket.off("order:cancelled", handleStatusUpdate);
      socket.off("order:delivered", handleStatusUpdate);
    };
  }, [socket, isConnected]);

  // Re-fetch orders from REST API on socket reconnect
  const wasConnectedRef = React.useRef(isConnected);
  useEffect(() => {
    if (!wasConnectedRef.current && isConnected) {
      fetchOrders();
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/v1/eats/orders/me/myOrders");
      setOrders(res.data.orders || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    setCancellingOrderId(orderId);
    try {
      await api.put(`/v1/eats/orders/${orderId}/status`, {
        orderStatus: "Cancelled",
        cancelReason: "Cancelled by customer via My Orders",
      });
      toast.info("Order has been cancelled successfully");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel order");
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleReorder = async (order) => {
    if (!order.orderItems || order.orderItems.length === 0) return;
    const restId = order.restaurant?._id || order.restaurant;

    try {
      for (const item of order.orderItems) {
        const foodId = item.fooditem?._id || item.fooditem;
        if (foodId && restId) {
          await dispatch(addItemToCart(foodId, item.quantity || 1, restId));
        }
      }
      toast.success("Items added to your cart!");
      navigate("/cart");
    } catch (e) {
      toast.error("Could not add items to cart");
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (filterTab === "active") {
      return (
        o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled"
      );
    }
    if (filterTab === "completed") {
      return o.orderStatus === "Delivered";
    }
    if (filterTab === "cancelled") {
      return o.orderStatus === "Cancelled";
    }
    return true;
  });

  return (
    <div className="container py-4 my-orders-page" style={{ minHeight: "80vh" }}>
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 pb-2 border-bottom">
        <div>
          <h2 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <FontAwesomeIcon icon={faReceipt} className="text-warning" />
            My Orders
          </h2>
          <p className="text-muted mb-0 small">
            View order details, track live deliveries, reorder, or cancel eligible orders.
          </p>
        </div>
        <Link to="/" className="btn btn-outline-dark btn-sm rounded-pill px-3 mt-2 mt-md-0">
          <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Back to Restaurants
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-4 overflow-auto pb-1">
        {[
          { key: "all", label: `All Orders (${orders.length})` },
          {
            key: "active",
            label: `Live / Active (${
              orders.filter(
                (o) => o.orderStatus !== "Delivered" && o.orderStatus !== "Cancelled"
              ).length
            })`,
          },
          {
            key: "completed",
            label: `Delivered (${orders.filter((o) => o.orderStatus === "Delivered").length})`,
          },
          {
            key: "cancelled",
            label: `Cancelled (${orders.filter((o) => o.orderStatus === "Cancelled").length})`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`btn btn-sm rounded-pill px-3 fw-bold ${
              filterTab === tab.key
                ? "btn-dark text-white shadow-sm"
                : "btn-outline-secondary"
            }`}
            onClick={() => setFilterTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List / Loading / Empty */}
      {loading ? (
        <div className="text-center py-5">
          <FontAwesomeIcon icon={faSpinner} className="fa-spin text-warning fs-1 mb-3" />
          <h6 className="text-muted">Loading your orders...</h6>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white my-4">
          <div className="mb-3">
            <span style={{ fontSize: "4rem" }}>🛍️</span>
          </div>
          <h4 className="fw-bold text-dark">No orders found</h4>
          <p className="text-muted small mx-auto" style={{ maxWidth: "400px" }}>
            {filterTab === "all"
              ? "You haven't placed any orders yet. Explore top restaurants and treat yourself!"
              : `You have no ${filterTab} orders at this moment.`}
          </p>
          <div>
            <Link to="/" className="btn btn-warning rounded-pill px-4 fw-bold shadow-sm">
              Explore Restaurants
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredOrders.map((order) => {
            const badge = STATUS_BADGES[order.orderStatus] || {
              bg: "bg-secondary",
              text: "text-white",
              icon: faCheckCircle,
            };
            const isCancellable =
              order.orderStatus === "Order Confirmed" ||
              order.orderStatus === "Processing";

            const formattedDate = new Date(order.createdAt).toLocaleDateString(
              "en-IN",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            );

            return (
              <div key={order._id} className="col-12">
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                  {/* Card Header */}
                  <div className="card-header bg-light border-bottom p-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      <span className="text-muted small">Order ID: </span>
                      <strong className="text-dark small">
                        #{order._id.slice(-8).toUpperCase()}
                      </strong>
                      <span className="mx-2 text-muted">•</span>
                      <span className="text-muted small">
                        <FontAwesomeIcon icon={faClock} className="me-1" />
                        {formattedDate}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className={`badge ${badge.bg} ${badge.text} rounded-pill px-3 py-2 small fw-bold d-inline-flex align-items-center gap-1`}
                      >
                        <FontAwesomeIcon icon={badge.icon} />
                        {order.orderStatus}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="card-body p-4">
                    <div className="row g-3">
                      {/* Left: Restaurant & Food Items */}
                      <div className="col-lg-8 border-end-lg">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <FontAwesomeIcon icon={faUtensils} className="text-warning" />
                          <h5 className="fw-bold mb-0 text-dark">
                            {order.restaurant?.name || "Restaurant"}
                          </h5>
                          {order.restaurant?.address && (
                            <small className="text-muted">
                              ({order.restaurant.address})
                            </small>
                          )}
                        </div>

                        {/* Order Items List */}
                        <div className="order-items-list mb-3">
                          {order.orderItems?.map((item, idx) => (
                            <div
                              key={idx}
                              className="d-flex align-items-center justify-content-between py-2 border-bottom"
                            >
                              <div className="d-flex align-items-center gap-3">
                                <img
                                  src={item.image || "/images/placeholder.png"}
                                  alt={item.name}
                                  className="rounded-3"
                                  style={{
                                    width: "48px",
                                    height: "48px",
                                    objectFit: "cover",
                                  }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src =
                                      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100";
                                  }}
                                />
                                <div>
                                  <div className="fw-bold small text-dark">
                                    {item.name}
                                  </div>
                                  <small className="text-muted">
                                    Qty: {item.quantity} × ₹{item.price}
                                  </small>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-3">
                                <span className="fw-bold text-dark">
                                  ₹{item.price * item.quantity}
                                </span>
                                {order.orderStatus === "Delivered" && (
                                  <button
                                    className="btn btn-outline-warning btn-sm rounded-pill px-2 py-1 small"
                                    title="Rate this dish"
                                    onClick={() => setReviewFoodItem(item)}
                                  >
                                    <FontAwesomeIcon icon={faStar} className="me-1" />
                                    Rate
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Delivery Address */}
                        <div className="text-muted small">
                          <FontAwesomeIcon
                            icon={faLocationDot}
                            className="text-danger me-1"
                          />
                          Delivery to:{" "}
                          <strong>
                            {order.deliveryInfo?.address}, {order.deliveryInfo?.city}
                          </strong>{" "}
                          (Phone: {order.deliveryInfo?.phoneNo})
                        </div>
                      </div>

                      {/* Right: Bill Summary & Actions */}
                      <div className="col-lg-4 d-flex flex-column justify-content-between">
                        <div className="p-3 bg-light rounded-3 mb-3">
                          <div className="d-flex justify-content-between small text-muted mb-1">
                            <span>Items Subtotal</span>
                            <span>₹{order.itemsPrice}</span>
                          </div>
                          <div className="d-flex justify-content-between small text-muted mb-1">
                            <span>Delivery Fee</span>
                            <span>
                              {order.deliveryCharge === 0
                                ? "FREE"
                                : `₹${order.deliveryCharge}`}
                            </span>
                          </div>
                          {order.taxPrice > 0 && (
                            <div className="d-flex justify-content-between small text-muted mb-1">
                              <span>Taxes & Charges</span>
                              <span>₹{order.taxPrice}</span>
                            </div>
                          )}
                          <hr className="my-2" />
                          <div className="d-flex justify-content-between fw-bold text-dark">
                            <span>Total Paid</span>
                            <span className="text-success fs-6">
                              ₹{order.finalTotal}
                            </span>
                          </div>
                          <div className="small text-muted mt-2">
                            Mode:{" "}
                            <span className="badge bg-secondary">
                              {order.paymentInfo?.id?.startsWith("COD")
                                ? "Cash on Delivery"
                                : "Online Paid"}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex flex-column gap-2">
                          {/* Live Track */}
                          <Link
                            to={`/order/${order._id}`}
                            className="btn btn-warning rounded-pill fw-bold btn-sm py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                          >
                            <FontAwesomeIcon icon={faMotorcycle} />
                            Track Live Order
                          </Link>

                          {/* Reorder */}
                          <button
                            className="btn btn-outline-dark rounded-pill fw-bold btn-sm py-2 d-flex align-items-center justify-content-center gap-2"
                            onClick={() => handleReorder(order)}
                          >
                            <FontAwesomeIcon icon={faRotateRight} />
                            Reorder All Items
                          </button>

                          {/* Cancel Order (Eligible only) */}
                          {isCancellable && (
                            <button
                              className="btn btn-outline-danger rounded-pill fw-bold btn-sm py-1 d-flex align-items-center justify-content-center gap-1"
                              disabled={cancellingOrderId === order._id}
                              onClick={() => handleCancelOrder(order._id)}
                            >
                              {cancellingOrderId === order._id ? (
                                <>
                                  <FontAwesomeIcon
                                    icon={faSpinner}
                                    className="fa-spin"
                                  />{" "}
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <FontAwesomeIcon icon={faTimesCircle} /> Cancel Order
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewFoodItem && (
        <ReviewModal
          foodItem={reviewFoodItem}
          onClose={() => setReviewFoodItem(null)}
          onReviewSubmitted={() => {
            toast.success("Thank you for your review!");
          }}
        />
      )}
    </div>
  );
};

export default MyOrders;

