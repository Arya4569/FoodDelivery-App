import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";

const AvailableOrders = ({ isOnline, onRefreshProfile }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAvailableOrders = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const res = await api.get("/v1/delivery/orders/available", config);
      if (res.data && res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error("Error fetching available orders:", err);
      // Don't show toast on 403 (e.g. if partner is pending verification)
      if (err.response?.status !== 403) {
        toast.error(err.response?.data?.message || "Failed to load available orders");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableOrders();
  }, []);

  if (!isOnline) {
    return (
      <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-light">
        <div className="display-4 mb-3">📴</div>
        <h4 className="fw-bold">You are currently Offline</h4>
        <p className="text-muted mb-0">
          Switch your status to <strong>Online</strong> at the top of the dashboard to view and receive delivery orders.
        </p>
      </div>
    );
  }

  return (
    <div className="available-orders-section">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-0">Available Orders for Pickup 🛍️</h4>
          <p className="text-muted small mb-0">
            Orders prepared by restaurants ready for delivery assignment
          </p>
        </div>
        <button
          className="btn btn-outline-dark btn-sm rounded-pill px-3"
          onClick={fetchAvailableOrders}
          disabled={loading}
        >
          🔄 {loading ? "Refreshing..." : "Refresh Feed"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status"></div>
          <p className="mt-2 text-muted small">Checking for available orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
          <div className="display-4 mb-2">🍽️</div>
          <h5 className="fw-bold mb-1">No Orders Awaiting Pickup Right Now</h5>
          <p className="text-muted mb-0">
            New orders from partner restaurants will appear here in real-time as chefs finish preparing them.
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {orders.map((ord) => (
            <div key={ord._id} className="col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow-sm rounded-4 p-3 order-delivery-card bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="badge bg-warning text-dark rounded-pill fw-bold">
                    #{ord._id.slice(-6).toUpperCase()}
                  </span>
                  <span className="badge bg-success text-white rounded-pill">
                    ₹{ord.estimatedEarnings} Payout
                  </span>
                </div>

                <h6 className="fw-bold text-dark mb-1">
                  🏪 {ord.restaurant?.name || "Restaurant"}
                </h6>
                <p className="small text-muted mb-2 text-truncate">
                  📍 {ord.restaurant?.address || "Pickup address"}
                </p>

                <div className="p-2 rounded-3 bg-light mb-3 small">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Destination:</span>
                    <strong className="text-dark">{ord.destinationArea}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Items Count:</span>
                    <strong className="text-dark">{ord.itemsCount} Items</strong>
                  </div>
                </div>

                <div className="mt-auto d-flex align-items-center justify-content-between pt-2 border-top">
                  <span className="badge bg-info-subtle text-info border border-info rounded-pill">
                    {ord.orderStatus}
                  </span>
                  <small className="text-muted">
                    {new Date(ord.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableOrders;

