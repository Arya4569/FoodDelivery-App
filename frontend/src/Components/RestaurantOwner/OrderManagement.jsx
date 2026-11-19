import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShoppingBag,
  faClock,
  faCheck,
  faTimes,
  faEye,
  faUser,
  faPhone,
  faMapMarkerAlt,
  faReceipt,
  faRefresh,
  faUtensils,
  faMotorcycle,
  faCheckCircle,
  faBan,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { useSocket } from "../../context/SocketContext";

const OrderManagement = ({
  restaurants = [],
  selectedRestaurantId,
  selectedOrder = null,
}) => {
  const { socket, isConnected, joinRestaurant, leaveRestaurant } = useSocket();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed Modal State
  const [activeOrderModal, setActiveOrderModal] = useState(null);

  // Reject Modal State
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState("Kitchen is currently out of required ingredients");
  const [updating, setUpdating] = useState(false);

  // Auto open selected order if passed from overview
  useEffect(() => {
    if (selectedOrder) {
      setActiveOrderModal(selectedOrder);
    }
  }, [selectedOrder]);

  // Join authorized restaurant socket rooms
  useEffect(() => {
    if (!isConnected || !restaurants || restaurants.length === 0) return;

    restaurants.forEach((r) => {
      if (r._id) {
        joinRestaurant(r._id);
      }
    });

    return () => {
      restaurants.forEach((r) => {
        if (r._id) {
          leaveRestaurant(r._id);
        }
      });
    };
  }, [isConnected, restaurants]);

  // Real-time socket event listeners for incoming & updated orders
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewOrder = (payload) => {
      if (!payload?.order) return;
      const newOrd = payload.order;
      const orderRestId = newOrd.restaurant?._id || newOrd.restaurant;

      // Check if order belongs to one of owner's restaurants
      const isMyRest = restaurants.some(
        (r) => r._id.toString() === orderRestId.toString()
      );

      if (isMyRest) {
        // If filtered by restaurant, check that it matches
        if (selectedRestaurantId && selectedRestaurantId !== orderRestId.toString()) {
          return;
        }

        // Avoid duplicates
        setOrders((prev) => {
          const exists = prev.some((o) => o._id === newOrd._id);
          if (exists) return prev;
          return [newOrd, ...prev];
        });

        toast.success(
          `🔔 New Order Received! #${newOrd._id.slice(-6).toUpperCase()} for ₹${newOrd.finalTotal}`,
          { position: "top-right", autoClose: 6000 }
        );
      }
    };

    const handleStatusUpdate = (payload) => {
      const incomingId = payload?.orderId || payload?.order?._id;
      const newStatus = payload?.orderStatus || payload?.order?.orderStatus;
      if (!incomingId) return;

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord._id === incomingId) {
            return {
              ...ord,
              orderStatus: newStatus || ord.orderStatus,
              cancelReason: payload.reason || payload.order?.cancelReason || ord.cancelReason,
            };
          }
          return ord;
        })
      );

      // Also update modal if currently viewing this order
      setActiveOrderModal((currentModal) => {
        if (currentModal && currentModal._id === incomingId) {
          return {
            ...currentModal,
            orderStatus: newStatus || currentModal.orderStatus,
            cancelReason: payload.reason || payload.order?.cancelReason || currentModal.cancelReason,
          };
        }
        return currentModal;
      });
    };

    socket.on("order:created", handleNewOrder);
    socket.on("order:status_updated", handleStatusUpdate);
    socket.on("order:preparing", handleStatusUpdate);
    socket.on("order:ready_for_pickup", handleStatusUpdate);
    socket.on("order:cancelled", handleStatusUpdate);
    socket.on("order:rejected", handleStatusUpdate);

    return () => {
      socket.off("order:created", handleNewOrder);
      socket.off("order:status_updated", handleStatusUpdate);
      socket.off("order:preparing", handleStatusUpdate);
      socket.off("order:ready_for_pickup", handleStatusUpdate);
      socket.off("order:cancelled", handleStatusUpdate);
      socket.off("order:rejected", handleStatusUpdate);
    };
  }, [socket, isConnected, restaurants, selectedRestaurantId]);

  // Re-fetch orders from REST API on socket reconnect
  const wasConnectedRef = React.useRef(isConnected);
  useEffect(() => {
    if (!wasConnectedRef.current && isConnected) {
      console.log("[OrderManagement] Reconnected! Refreshing orders from REST API...");
      fetchOrders();
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = [];
      if (selectedRestaurantId) {
        queryParams.push(`restaurantId=${selectedRestaurantId}`);
      }
      if (statusFilter !== "All") {
        queryParams.push(`status=${encodeURIComponent(statusFilter)}`);
      }
      const qs = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const { data } = await api.get(`/v1/owner/orders${qs}`);
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedRestaurantId, statusFilter]);

  // Update order status action
  const handleUpdateStatus = async (orderId, newStatus, reason = "") => {
    setUpdating(true);
    try {
      const payload = { newStatus };
      if (reason) payload.reason = reason;

      const { data } = await api.put(`/v1/owner/orders/${orderId}/status`, payload);
      toast.success(data.message || `Order status updated to "${newStatus}"!`);

      // Update in state
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? data.order : o))
      );
      if (activeOrderModal && activeOrderModal._id === orderId) {
        setActiveOrderModal(data.order);
      }
      setRejectingOrder(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Order Confirmed":
        return <span className="badge badge-status-confirmed px-3 py-1.5 rounded-pill">Confirmed</span>;
      case "Preparing":
        return <span className="badge badge-status-preparing px-3 py-1.5 rounded-pill">Preparing in Kitchen</span>;
      case "Ready for Pickup":
        return <span className="badge badge-status-pickup px-3 py-1.5 rounded-pill">Ready for Pickup</span>;
      case "Out for Delivery":
        return <span className="badge badge-status-out px-3 py-1.5 rounded-pill">Out for Delivery</span>;
      case "Delivered":
        return <span className="badge badge-status-delivered px-3 py-1.5 rounded-pill">Delivered</span>;
      case "Cancelled":
      case "Rejected":
        return <span className="badge badge-status-cancelled px-3 py-1.5 rounded-pill">{status}</span>;
      default:
        return <span className="badge bg-secondary px-3 py-1.5 rounded-pill">{status}</span>;
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const idMatch = o._id.toLowerCase().includes(query);
    const userMatch = o.user?.name?.toLowerCase().includes(query);
    const restMatch = o.restaurant?.name?.toLowerCase().includes(query);
    return idMatch || userMatch || restMatch;
  });

  return (
    <div className="order-management">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">📦 Orders & Kitchen Queue</h4>
          <p className="text-muted small mb-0">
            Accept incoming orders, update live preparation status, and prepare orders for delivery partner pickup.
          </p>
        </div>

        <button
          className="btn btn-outline-secondary rounded-pill btn-sm px-3"
          onClick={fetchOrders}
        >
          <FontAwesomeIcon icon={faRefresh} className="me-1" /> Refresh Queue
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="owner-table-card p-3 mb-4">
        <div className="row g-2 align-items-center justify-content-between">
          {/* Status Tabs */}
          <div className="col-12 col-lg-8">
            <div className="d-flex gap-1 flex-wrap">
              {[
                { id: "All", label: "All Orders" },
                { id: "Order Confirmed", label: "Incoming / New" },
                { id: "Preparing", label: "Cooking (Preparing)" },
                { id: "Ready for Pickup", label: "Ready for Pickup" },
                { id: "Out for Delivery", label: "Out for Delivery" },
                { id: "Delivered", label: "Completed" },
                { id: "Cancelled", label: "Cancelled / Rejected" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`btn btn-sm rounded-pill px-3 ${
                    statusFilter === tab.id
                      ? "btn-dark fw-bold text-warning shadow-sm"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="col-12 col-lg-4">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <FontAwesomeIcon icon={faSearch} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0 shadow-none"
                placeholder="Search by order ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="alert alert-danger rounded-4 p-3 mb-4 d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-danger" onClick={fetchOrders}>
            Retry
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div className="owner-table-card p-5 text-center">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading orders...</span>
          </div>
          <p className="text-muted mt-2 mb-0">Fetching live orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* EMPTY STATE */
        <div className="owner-table-card p-5 text-center">
          <FontAwesomeIcon icon={faShoppingBag} className="display-4 text-secondary mb-3" />
          <h5 className="fw-bold text-dark">No Orders Found</h5>
          <p className="text-muted mb-0">
            {statusFilter !== "All" || searchQuery
              ? "No orders match the selected filter or search query."
              : "No orders have been received yet for your restaurant."}
          </p>
        </div>
      ) : (
        /* ORDERS LIST / TABLE */
        <div className="owner-table-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order Info</th>
                  <th>Customer & Delivery</th>
                  <th>Items Ordered</th>
                  <th>Total</th>
                  <th>Live Status</th>
                  <th className="text-end">Manage Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const isConfirmed = ord.orderStatus === "Order Confirmed";
                  const isPreparing = ord.orderStatus === "Preparing";
                  const isReady = ord.orderStatus === "Ready for Pickup";
                  const isOut = ord.orderStatus === "Out for Delivery";
                  const isDelivered = ord.orderStatus === "Delivered";
                  const isCancelled =
                    ord.orderStatus === "Cancelled" || ord.orderStatus === "Rejected";

                  return (
                    <tr key={ord._id}>
                      <td>
                        <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>
                          #{ord._id.slice(-6).toUpperCase()}
                        </div>
                        <small className="text-muted d-block" style={{ fontSize: "11px" }}>
                          {new Date(ord.createdAt).toLocaleDateString()}{" "}
                          {new Date(ord.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                        <span className="badge bg-light text-secondary border mt-1" style={{ fontSize: "10px" }}>
                          {ord.restaurant?.name || "My Outlet"}
                        </span>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                          {ord.user?.name || "Customer"}
                        </div>
                        <div className="text-muted small">
                          <FontAwesomeIcon icon={faPhone} className="me-1 text-secondary" />
                          {ord.deliveryInfo?.phoneNo || ord.user?.phoneNumber || "-"}
                        </div>
                        <small className="text-secondary text-truncate d-block" style={{ maxWidth: "180px", fontSize: "11px" }}>
                          {ord.deliveryInfo?.address}, {ord.deliveryInfo?.city}
                        </small>
                      </td>

                      <td style={{ maxWidth: "220px" }}>
                        <div className="d-flex flex-column gap-1">
                          {ord.orderItems?.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="small text-dark text-truncate">
                              <strong className="text-primary">{item.quantity}x</strong> {item.name}
                            </span>
                          ))}
                          {ord.orderItems?.length > 3 && (
                            <small className="text-muted">
                              +{ord.orderItems.length - 3} more items...
                            </small>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="fw-bold text-success fs-6">₹{ord.finalTotal}</div>
                        <span className="badge bg-light text-secondary border" style={{ fontSize: "10px" }}>
                          {ord.paymentInfo?.status || "Paid"}
                        </span>
                      </td>

                      <td>
                        {getStatusBadge(ord.orderStatus)}
                        {ord.cancelReason && (
                          <small className="d-block text-danger mt-1" style={{ fontSize: "11px" }}>
                            Reason: {ord.cancelReason}
                          </small>
                        )}
                      </td>

                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1 flex-wrap">
                          {/* VIEW DETAILS BUTTON */}
                          <button
                            className="btn btn-sm btn-outline-dark rounded-pill px-2.5"
                            onClick={() => setActiveOrderModal(ord)}
                            title="View Full Order Details"
                          >
                            <FontAwesomeIcon icon={faEye} /> View
                          </button>

                          {/* ACTION 1: ACCEPT ORDER (Transitions from 'Order Confirmed' to 'Preparing') */}
                          {isConfirmed && (
                            <>
                              <button
                                className="btn btn-sm btn-success rounded-pill px-3 fw-bold"
                                onClick={() => handleUpdateStatus(ord._id, "Preparing")}
                                disabled={updating}
                              >
                                <FontAwesomeIcon icon={faCheck} className="me-1" /> Accept Order
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill px-2.5"
                                onClick={() => setRejectingOrder(ord)}
                                disabled={updating}
                                title="Reject order with reason"
                              >
                                <FontAwesomeIcon icon={faTimes} /> Reject
                              </button>
                            </>
                          )}

                          {/* ACTION 2: MARK READY FOR PICKUP (From 'Preparing' to 'Ready for Pickup') */}
                          {isPreparing && (
                            <>
                              <button
                                className="btn btn-sm btn-warning text-dark fw-bold rounded-pill px-3 shadow-sm"
                                onClick={() => handleUpdateStatus(ord._id, "Ready for Pickup")}
                                disabled={updating}
                              >
                                <FontAwesomeIcon icon={faUtensils} className="me-1" /> Ready for Pickup
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill px-2"
                                onClick={() => setRejectingOrder(ord)}
                                disabled={updating}
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {/* ACTION 3: READY FOR PICKUP NOTICE */}
                          {isReady && (
                            <span className="badge bg-light text-primary border px-2.5 py-1.5 rounded-pill small">
                              🛵 Awaiting Delivery Partner
                            </span>
                          )}

                          {/* ACTION 4: OUT FOR DELIVERY NOTICE */}
                          {isOut && (
                            <span className="badge bg-light text-success border px-2.5 py-1.5 rounded-pill small">
                              🛵 On the way to customer
                            </span>
                          )}

                          {/* ACTION 5: DELIVERED / CANCELLED */}
                          {isDelivered && (
                            <span className="badge bg-success-subtle text-success px-2.5 py-1.5 rounded-pill small">
                              Completed
                            </span>
                          )}
                          {isCancelled && (
                            <span className="badge bg-danger-subtle text-danger px-2.5 py-1.5 rounded-pill small">
                              Closed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REJECT ORDER MODAL (MANDATORY REASON) */}
      {rejectingOrder && (
        <div
          className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            zIndex: 1080,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setRejectingOrder(null)}
        >
          <div
            className="modal-card-custom bg-white rounded-4 shadow-lg p-4"
            style={{ width: "100%", maxWidth: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center gap-2 mb-3 text-danger">
              <FontAwesomeIcon icon={faBan} className="fs-3" />
              <h5 className="fw-bold mb-0">Reject / Cancel Order</h5>
            </div>
            <p className="text-muted small mb-3">
              Order: <strong>#{rejectingOrder._id.slice(-6).toUpperCase()}</strong> • Customer:{" "}
              <strong>{rejectingOrder.user?.name}</strong>. Please specify the reason for rejection (this will be logged and inventory stock will be restored).
            </p>

            <div className="mb-3">
              <label className="form-label fw-semibold small text-dark">
                Rejection Reason <span className="text-danger">*</span>
              </label>
              <select
                className="form-select rounded-3 mb-2"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              >
                <option value="Kitchen is currently out of required ingredients">
                  Kitchen is currently out of required ingredients
                </option>
                <option value="Restaurant is experiencing high order volume and closing incoming orders">
                  Restaurant is experiencing high order volume
                </option>
                <option value="Kitchen is closing early for maintenance">
                  Kitchen is closing early for maintenance
                </option>
                <option value="Delivery address is outside serviceable radius">
                  Delivery address is outside serviceable radius
                </option>
                <option value="Other custom reason">Other custom reason</option>
              </select>

              <textarea
                rows="2"
                className="form-control rounded-3"
                placeholder="Custom reason explanation..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
            </div>

            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
              <button
                className="btn btn-outline-secondary rounded-pill px-3"
                onClick={() => setRejectingOrder(null)}
                disabled={updating}
              >
                Keep Order
              </button>
              <button
                className="btn btn-danger rounded-pill px-4 fw-bold shadow-sm"
                onClick={() =>
                  handleUpdateStatus(rejectingOrder._id, "Rejected", rejectReason)
                }
                disabled={updating || !rejectReason.trim()}
              >
                {updating ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL ORDER DETAILS MODAL */}
      {activeOrderModal && (
        <div
          className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            zIndex: 1070,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setActiveOrderModal(null)}
        >
          <div
            className="modal-card-custom bg-white rounded-4 shadow-lg p-4"
            style={{ width: "100%", maxWidth: "620px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-3">
              <div>
                <h5 className="fw-bold mb-0 text-dark">
                  Order #{activeOrderModal._id.slice(-6).toUpperCase()}
                </h5>
                <small className="text-muted">
                  Placed on {new Date(activeOrderModal.createdAt).toLocaleString()}
                </small>
              </div>
              <button
                className="btn btn-sm btn-outline-secondary rounded-circle"
                onClick={() => setActiveOrderModal(null)}
                style={{ width: "32px", height: "32px", padding: 0 }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Current Status Pill */}
            <div className="p-3 bg-light rounded-4 mb-3 d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted d-block">Current Order Status</small>
                <strong className="text-dark fs-6">{activeOrderModal.orderStatus}</strong>
              </div>
              {getStatusBadge(activeOrderModal.orderStatus)}
            </div>

            {/* Customer & Delivery Information */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <div className="p-3 rounded-4 border bg-white h-100">
                  <h6 className="fw-bold text-dark mb-2">
                    <FontAwesomeIcon icon={faUser} className="text-primary me-2" />
                    Customer Details
                  </h6>
                  <p className="mb-1 small">
                    <strong>Name:</strong> {activeOrderModal.user?.name || "Customer"}
                  </p>
                  <p className="mb-1 small">
                    <strong>Email:</strong> {activeOrderModal.user?.email || "-"}
                  </p>
                  <p className="mb-0 small">
                    <strong>Phone:</strong> {activeOrderModal.deliveryInfo?.phoneNo || activeOrderModal.user?.phoneNumber || "-"}
                  </p>
                </div>
              </div>

              <div className="col-md-6">
                <div className="p-3 rounded-4 border bg-white h-100">
                  <h6 className="fw-bold text-dark mb-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-danger me-2" />
                    Delivery Destination
                  </h6>
                  <p className="mb-1 small text-dark">
                    {activeOrderModal.deliveryInfo?.address}
                  </p>
                  <p className="mb-0 small text-muted">
                    {activeOrderModal.deliveryInfo?.city}, {activeOrderModal.deliveryInfo?.postalCode}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Ordered List */}
            <h6 className="fw-bold text-dark mb-2">
              <FontAwesomeIcon icon={faUtensils} className="text-warning me-2" />
              Kitchen Order Items ({activeOrderModal.orderItems?.length || 0})
            </h6>

            <div className="table-responsive mb-3 border rounded-3">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Price</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrderModal.orderItems?.map((it, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {it.image && (
                            <img
                              src={it.image}
                              alt={it.name}
                              className="rounded-2"
                              style={{ width: "32px", height: "32px", objectFit: "cover" }}
                            />
                          )}
                          <span className="fw-semibold text-dark small">{it.name}</span>
                        </div>
                      </td>
                      <td className="text-center fw-bold text-primary">{it.quantity}</td>
                      <td className="text-end small">₹{it.price}</td>
                      <td className="text-end fw-bold text-dark small">₹{it.price * it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-light rounded-4 mb-3">
              <div className="d-flex justify-content-between small mb-1">
                <span className="text-muted">Items Subtotal:</span>
                <span>₹{activeOrderModal.itemsPrice}</span>
              </div>
              <div className="d-flex justify-content-between small mb-1">
                <span className="text-muted">Delivery Charges:</span>
                <span>₹{activeOrderModal.deliveryCharge}</span>
              </div>
              <div className="d-flex justify-content-between small mb-1">
                <span className="text-muted">Taxes & Fees:</span>
                <span>₹{activeOrderModal.taxPrice || 0}</span>
              </div>
              <div className="d-flex justify-content-between fw-bold fs-6 pt-2 border-top text-dark">
                <span>Final Order Total:</span>
                <span className="text-success">₹{activeOrderModal.finalTotal}</span>
              </div>
            </div>

            {/* Rejection / Cancellation note if any */}
            {activeOrderModal.cancelReason && (
              <div className="alert alert-danger rounded-3 p-2 small mb-3">
                <strong>Reason for Rejection:</strong> {activeOrderModal.cancelReason}
              </div>
            )}

            {/* Action buttons in modal */}
            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
              {activeOrderModal.orderStatus === "Order Confirmed" && (
                <>
                  <button
                    className="btn btn-outline-danger rounded-pill px-3"
                    onClick={() => {
                      setRejectingOrder(activeOrderModal);
                    }}
                  >
                    Reject Order
                  </button>
                  <button
                    className="btn btn-success rounded-pill px-4 fw-bold"
                    onClick={() => handleUpdateStatus(activeOrderModal._id, "Preparing")}
                    disabled={updating}
                  >
                    <FontAwesomeIcon icon={faCheck} className="me-1" /> Accept & Start Preparing
                  </button>
                </>
              )}

              {activeOrderModal.orderStatus === "Preparing" && (
                <button
                  className="btn btn-warning text-dark fw-bold rounded-pill px-4"
                  onClick={() => handleUpdateStatus(activeOrderModal._id, "Ready for Pickup")}
                  disabled={updating}
                >
                  <FontAwesomeIcon icon={faUtensils} className="me-1" /> Mark Ready for Pickup
                </button>
              )}

              <button
                className="btn btn-outline-secondary rounded-pill px-3"
                onClick={() => setActiveOrderModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;

