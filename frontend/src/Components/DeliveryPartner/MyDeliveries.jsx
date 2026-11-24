import React, { useEffect, useState, useRef } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useSocket } from "../../context/SocketContext";
import LiveTrackingMap from "./LiveTrackingMap";

const MyDeliveries = ({ onRefreshStats }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [activeTab, setActiveTab] = useState("active"); // 'active' or 'history'
  const [loading, setLoading] = useState(true);

  // OTP Verification State
  const [otpModalOrder, setOtpModalOrder] = useState(null);
  const [otpInput, setOtpInput] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Real-time GPS Geolocation State
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [latestCoords, setLatestCoords] = useState(null);
  const watchIdRef = useRef(null);
  const lastEmitTimeRef = useRef(0);

  const { socket, isConnected } = useSocket();

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const res = await api.get("/v1/delivery/orders/my-deliveries", config);
      if (res.data && res.data.success) {
        setDeliveries(res.data.orders || []);
      }
    } catch (err) {
      console.error("Error fetching deliveries:", err);
      toast.error(err.response?.data?.message || "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  // Filter active and completed orders
  const activeOrders = deliveries.filter((d) =>
    ["Assigned", "Picked Up", "Out for Delivery"].includes(d.orderStatus)
  );
  const completedOrders = deliveries.filter((d) => d.orderStatus === "Delivered");

  // Current active delivery (if any)
  const currentActiveDelivery = activeOrders[0] || null;

  // =========================================================================
  // BROWSER GEOLOCATION GPS TRACKING
  // =========================================================================
  const startGpsTracking = (orderId) => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGpsError(null);
    setGpsActive(true);

    const targetOrderId = orderId || currentActiveDelivery?._id;

    // Use watchPosition for continuous real-time updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;
        const coords = {
          latitude,
          longitude,
          heading: heading || 0,
          speed: speed || 0,
          updatedAt: new Date(),
        };
        setLatestCoords(coords);

        // Throttle emissions: at most once every 2 seconds
        const now = Date.now();
        if (now - lastEmitTimeRef.current >= 2000) {
          lastEmitTimeRef.current = now;

          // 1. Send via Socket.IO if connected
          if (socket && isConnected) {
            socket.emit("delivery:location_update", {
              orderId: targetOrderId,
              latitude,
              longitude,
              heading: coords.heading,
              speed: coords.speed,
            });
          }

          // 2. Fallback REST update
          const token = sessionStorage.getItem("token") || localStorage.getItem("token");
          if (token) {
            api
              .post(
                "/v1/delivery/location",
                {
                  orderId: targetOrderId,
                  latitude,
                  longitude,
                  heading: coords.heading,
                  speed: coords.speed,
                },
                { headers: { Authorization: `Bearer ${token}` } }
              )
              .catch((e) => console.warn("Background location REST push:", e.message));
          }
        }
      },
      (err) => {
        console.error("GPS Watch error:", err);
        let msg = "Could not access GPS location";
        if (err.code === 1) msg = "Location permission denied. Please allow location access.";
        else if (err.code === 2) msg = "Location unavailable. Please check GPS signal.";
        else if (err.code === 3) msg = "Location request timed out.";
        setGpsError(msg);
        toast.warn(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000,
      }
    );
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsActive(false);
  };

  // Clean up GPS watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Auto-start GPS tracking if there is an active delivery and not yet active
  useEffect(() => {
    if (currentActiveDelivery && !gpsActive && watchIdRef.current === null) {
      startGpsTracking(currentActiveDelivery._id);
    } else if (!currentActiveDelivery && gpsActive) {
      stopGpsTracking();
    }
  }, [currentActiveDelivery?._id]);

  // Listen for socket events to update active order in real time
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data) => {
      if (data?.orderId) {
        fetchDeliveries();
        if (onRefreshStats) onRefreshStats();
      }
    };

    socket.on("order:status_updated", handleStatusUpdate);
    socket.on("order:assigned", handleStatusUpdate);

    return () => {
      socket.off("order:status_updated", handleStatusUpdate);
      socket.off("order:assigned", handleStatusUpdate);
    };
  }, [socket]);

  // =========================================================================
  // STATUS TRANSITION ACTIONS
  // =========================================================================
  const handleMarkPickedUp = async (orderId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await api.put(
        `/v1/delivery/orders/${orderId}/pickup`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        toast.success("Order marked as Picked Up! 🛍️");
        fetchDeliveries();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark order picked up");
    }
  };

  const handleMarkOutForDelivery = async (orderId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await api.put(
        `/v1/delivery/orders/${orderId}/out-for-delivery`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        toast.success("Order is Out for Delivery! 🚚 GPS sharing active.");
        fetchDeliveries();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start delivery");
    }
  };

  const handleVerifyOtpAndDeliver = async () => {
    if (!otpInput || otpInput.trim().length !== 4) {
      toast.error("Please enter the complete 4-digit customer delivery OTP");
      return;
    }

    try {
      setVerifyingOtp(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await api.put(
        `/v1/delivery/orders/${otpModalOrder._id}/deliver`,
        { otp: otpInput.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        toast.success(`🎉 Delivery Complete! +₹${res.data.earningsEarned} credited!`);
        stopGpsTracking();
        setOtpModalOrder(null);
        setOtpInput("");
        fetchDeliveries();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP code");
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="my-deliveries-section">
      {/* Sub Tabs */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="btn-group rounded-pill p-1 bg-white shadow-sm border">
          <button
            className={`btn btn-sm rounded-pill px-4 fw-bold ${
              activeTab === "active" ? "btn-warning text-dark" : "btn-light text-muted"
            }`}
            onClick={() => setActiveTab("active")}
          >
            🛵 Active Deliveries ({activeOrders.length})
          </button>
          <button
            className={`btn btn-sm rounded-pill px-4 fw-bold ${
              activeTab === "history" ? "btn-warning text-dark" : "btn-light text-muted"
            }`}
            onClick={() => setActiveTab("history")}
          >
            📋 Delivery History ({completedOrders.length})
          </button>
        </div>

        <button
          className="btn btn-outline-dark btn-sm rounded-pill px-3"
          onClick={fetchDeliveries}
          disabled={loading}
        >
          🔄 {loading ? "Updating..." : "Refresh Deliveries"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status"></div>
          <p className="mt-2 text-muted small">Loading your deliveries...</p>
        </div>
      ) : activeTab === "active" ? (
        /* ================= ACTIVE DELIVERIES TAB ================= */
        activeOrders.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
            <div className="display-4 mb-2">🎉</div>
            <h5 className="fw-bold mb-1">No Active Orders Assigned</h5>
            <p className="text-muted mb-0">
              You are ready! Check the <strong>Available Orders</strong> tab or wait for new assignments from restaurant dispatch.
            </p>
          </div>
        ) : (
          <div className="row g-4">
            {activeOrders.map((ord) => (
              <div key={ord._id} className="col-lg-12">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white border-start border-4 border-warning">
                  {/* Top Bar */}
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 pb-3 border-bottom">
                    <div>
                      <span className="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold fs-6">
                        Order #{ord._id.slice(-6).toUpperCase()}
                      </span>
                      <span className="badge bg-primary text-white px-3 py-2 rounded-pill fw-bold ms-2">
                        {ord.orderStatus}
                      </span>
                    </div>

                    {/* Live GPS Broadcast Badge */}
                    <div className="d-flex align-items-center gap-2">
                      {gpsActive ? (
                        <div className="d-flex align-items-center gap-2 px-3 py-1 bg-success-subtle border border-success rounded-pill text-success small fw-bold">
                          <span className="pulse-indicator bg-success"></span>
                          <span>Broadcasting Live GPS</span>
                          <button
                            className="btn btn-link btn-sm text-danger p-0 ms-2 text-decoration-none"
                            onClick={stopGpsTracking}
                            title="Pause GPS"
                          >
                            ⏸️
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-outline-success btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-1 shadow-sm"
                          onClick={() => startGpsTracking(ord._id)}
                        >
                          📡 Enable Live GPS Broadcast
                        </button>
                      )}
                    </div>
                  </div>

                  {gpsError && (
                    <div className="alert alert-warning py-2 px-3 rounded-3 small mb-3">
                      ⚠️ {gpsError}
                    </div>
                  )}

                  {/* Order Details & Pickup/Drop Grid */}
                  <div className="row g-3 mb-4">
                    {/* Pickup Restaurant Details */}
                    <div className="col-md-6">
                      <div className="p-3 rounded-4 bg-light h-100 border">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="badge bg-danger text-white rounded-pill">
                            1. Pickup From 🏪
                          </span>
                          {ord.restaurant?.phoneNumber && (
                            <a
                              href={`tel:${ord.restaurant.phoneNumber}`}
                              className="btn btn-sm btn-outline-danger rounded-pill px-2 py-0"
                            >
                              📞 Call Restaurant
                            </a>
                          )}
                        </div>
                        <h6 className="fw-bold text-dark mb-1">
                          {ord.restaurant?.name || "Restaurant"}
                        </h6>
                        <p className="small text-muted mb-0">
                          {ord.restaurant?.address || "Address"}
                        </p>
                      </div>
                    </div>

                    {/* Customer Drop-off Details */}
                    <div className="col-md-6">
                      <div className="p-3 rounded-4 bg-light h-100 border">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="badge bg-success text-white rounded-pill">
                            2. Deliver To 📍
                          </span>
                          {ord.deliveryInfo?.phoneNo && (
                            <a
                              href={`tel:${ord.deliveryInfo.phoneNo}`}
                              className="btn btn-sm btn-outline-success rounded-pill px-2 py-0"
                            >
                              📞 Call Customer
                            </a>
                          )}
                        </div>
                        <h6 className="fw-bold text-dark mb-1">
                          {ord.user?.name || "Customer"}
                        </h6>
                        <p className="small text-muted mb-0">
                          {ord.deliveryInfo?.address}, {ord.deliveryInfo?.city} (
                          {ord.deliveryInfo?.postalCode})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Leaflet Map Component */}
                  <div className="mb-4">
                    <LiveTrackingMap
                      restaurant={ord.restaurant}
                      destination={{
                        address: ord.deliveryInfo?.address,
                        city: ord.deliveryInfo?.city,
                        lat: 18.5158,
                        lon: 73.8682,
                      }}
                      partnerLocation={latestCoords}
                      orderStatus={ord.orderStatus}
                      height="320px"
                    />
                  </div>

                  {/* Items Summary & Financials */}
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 rounded-4 bg-light mb-4">
                    <div>
                      <span className="text-muted small">Items: </span>
                      <strong className="text-dark small">
                        {ord.orderItems?.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                      </strong>
                    </div>
                    <div className="text-md-end">
                      <span className="text-muted small">Your Trip Earning: </span>
                      <span className="fs-5 fw-bold text-success">
                        ₹{(ord.deliveryCharge || 50) + 10}
                      </span>
                    </div>
                  </div>

                  {/* Status Action Buttons Workflow */}
                  <div className="d-flex align-items-center justify-content-end gap-2 flex-wrap">
                    {ord.orderStatus === "Assigned" && (
                      <button
                        className="btn btn-warning text-dark fw-bold rounded-pill px-4 shadow-sm"
                        onClick={() => handleMarkPickedUp(ord._id)}
                      >
                        🛍️ Mark as Picked Up
                      </button>
                    )}

                    {ord.orderStatus === "Picked Up" && (
                      <button
                        className="btn btn-primary text-white fw-bold rounded-pill px-4 shadow-sm"
                        onClick={() => handleMarkOutForDelivery(ord._id)}
                      >
                        🚚 Start Delivery (Out for Delivery)
                      </button>
                    )}

                    {(ord.orderStatus === "Out for Delivery" || ord.orderStatus === "Picked Up") && (
                      <button
                        className="btn btn-success text-white fw-bold rounded-pill px-4 shadow-sm"
                        onClick={() => {
                          setOtpModalOrder(ord);
                          setOtpInput("");
                        }}
                      >
                        🔑 Verify Customer OTP & Complete Delivery
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ================= COMPLETED DELIVERIES TAB ================= */
        completedOrders.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
            <div className="display-4 mb-2">📦</div>
            <h5 className="fw-bold mb-1">No Completed Deliveries Yet</h5>
            <p className="text-muted mb-0">
              Your delivered orders and earned payouts will be listed here.
            </p>
          </div>
        ) : (
          <div className="table-responsive bg-white rounded-4 shadow-sm p-3 border">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order</th>
                  <th>Restaurant</th>
                  <th>Destination</th>
                  <th>Completed At</th>
                  <th>Status</th>
                  <th>Earning</th>
                </tr>
              </thead>
              <tbody>
                {completedOrders.map((ord) => (
                  <tr key={ord._id}>
                    <td>
                      <span className="badge bg-secondary rounded-pill">
                        #{ord._id.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <strong className="text-dark">
                        {ord.restaurant?.name || "Restaurant"}
                      </strong>
                    </td>
                    <td className="small text-muted">
                      {ord.deliveryInfo?.city || "Local"}
                    </td>
                    <td className="small text-muted">
                      {ord.deliveredAt
                        ? new Date(ord.deliveredAt).toLocaleString([], {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "Completed"}
                    </td>
                    <td>
                      <span className="badge bg-success rounded-pill">
                        Delivered ✓
                      </span>
                    </td>
                    <td>
                      <strong className="text-success">
                        +₹{(ord.deliveryCharge || 50) + 10}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ================= OTP VERIFICATION MODAL ================= */}
      {otpModalOrder && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-warning text-dark border-0 p-4">
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    🔑 Verify Customer OTP
                  </h5>
                  <p className="small text-dark-50 mb-0">
                    Order #{otpModalOrder._id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setOtpModalOrder(null)}
                ></button>
              </div>

              <div className="modal-body p-4 text-center">
                <p className="text-muted mb-4">
                  Please ask <strong>{otpModalOrder.user?.name || "the customer"}</strong> for the 4-digit Delivery Confirmation Code shown on their tracking screen.
                </p>

                <div className="mb-4">
                  <input
                    type="text"
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="• • • •"
                    className="form-control form-control-lg otp-box-input py-3 rounded-4 shadow-sm"
                    autoFocus
                  />
                  <small className="text-muted mt-2 d-block">
                    Enter the 4-digit numeric code
                  </small>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-50 rounded-pill py-2 fw-bold"
                    onClick={() => setOtpModalOrder(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning w-50 rounded-pill py-2 fw-bold shadow-sm"
                    onClick={handleVerifyOtpAndDeliver}
                    disabled={verifyingOtp || otpInput.length !== 4}
                  >
                    {verifyingOtp ? "Verifying..." : "Confirm Delivery ✓"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDeliveries;

