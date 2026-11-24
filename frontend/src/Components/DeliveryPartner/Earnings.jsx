import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";

const Earnings = () => {
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("all"); // 'all', 'today', 'week'

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const res = await api.get("/v1/delivery/earnings", config);
      if (res.data && res.data.success) {
        setEarningsData(res.data.earnings);
      }
    } catch (err) {
      console.error("Error fetching earnings:", err);
      toast.error(err.response?.data?.message || "Failed to load earnings records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-warning" role="status"></div>
        <p className="mt-2 text-muted small">Loading your earnings analytics...</p>
      </div>
    );
  }

  const {
    totalEarnings = 0,
    pendingPayout = 0,
    completedPayout = 0,
    totalCompletedDeliveries = 0,
    todayEarnings = 0,
    todayDeliveriesCount = 0,
    history = [],
  } = earningsData || {};

  const avgPerDelivery =
    totalCompletedDeliveries > 0
      ? Math.round(totalEarnings / totalCompletedDeliveries)
      : 0;

  // Filter history
  const filteredHistory = history.filter((h) => {
    if (filterPeriod === "today") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return new Date(h.date) >= startOfToday;
    }
    if (filterPeriod === "week") {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(h.date) >= oneWeekAgo;
    }
    return true;
  });

  return (
    <div className="earnings-section">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-0">Delivery Partner Earnings 💰</h4>
          <p className="text-muted small mb-0">
            Real earnings credited from verified completed deliveries
          </p>
        </div>
        <button
          className="btn btn-outline-dark btn-sm rounded-pill px-3"
          onClick={fetchEarnings}
        >
          🔄 Refresh
        </button>
      </div>

      {/* 4 Analytics Summary Cards */}
      <div className="row g-3 mb-4">
        {/* Total Earnings */}
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white stat-card">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-bold">TOTAL EARNINGS</span>
              <span className="p-2 bg-warning-subtle text-warning rounded-circle fs-5">
                💵
              </span>
            </div>
            <h3 className="fw-bold text-dark mb-0">₹{totalEarnings}</h3>
            <small className="text-success fw-bold">
              +₹{todayEarnings} earned today
            </small>
          </div>
        </div>

        {/* Completed Deliveries */}
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white stat-card">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-bold">DELIVERIES DONE</span>
              <span className="p-2 bg-success-subtle text-success rounded-circle fs-5">
                🛵
              </span>
            </div>
            <h3 className="fw-bold text-dark mb-0">{totalCompletedDeliveries}</h3>
            <small className="text-muted">
              {todayDeliveriesCount} trips completed today
            </small>
          </div>
        </div>

        {/* Avg Per Delivery */}
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white stat-card">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-bold">AVG TRIP EARNING</span>
              <span className="p-2 bg-info-subtle text-info rounded-circle fs-5">
                📊
              </span>
            </div>
            <h3 className="fw-bold text-dark mb-0">₹{avgPerDelivery}</h3>
            <small className="text-muted">Per completed order</small>
          </div>
        </div>

        {/* Pending Payout */}
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white stat-card">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-bold">PAYOUT BALANCE</span>
              <span className="p-2 bg-primary-subtle text-primary rounded-circle fs-5">
                🏦
              </span>
            </div>
            <h3 className="fw-bold text-dark mb-0">₹{pendingPayout}</h3>
            <small className="text-primary fw-bold">Direct bank transfer scheduled</small>
          </div>
        </div>
      </div>

      {/* Date-wise Breakdown Table */}
      <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <h5 className="fw-bold mb-0">Itemized Trip Earnings History</h5>

          <div className="btn-group btn-group-sm rounded-pill border p-1 bg-light">
            <button
              className={`btn btn-sm rounded-pill px-3 ${
                filterPeriod === "all" ? "btn-warning text-dark fw-bold" : "btn-light text-muted"
              }`}
              onClick={() => setFilterPeriod("all")}
            >
              All Time
            </button>
            <button
              className={`btn btn-sm rounded-pill px-3 ${
                filterPeriod === "week" ? "btn-warning text-dark fw-bold" : "btn-light text-muted"
              }`}
              onClick={() => setFilterPeriod("week")}
            >
              Past 7 Days
            </button>
            <button
              className={`btn btn-sm rounded-pill px-3 ${
                filterPeriod === "today" ? "btn-warning text-dark fw-bold" : "btn-light text-muted"
              }`}
              onClick={() => setFilterPeriod("today")}
            >
              Today
            </button>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-5">
            <div className="display-5 mb-2">🧾</div>
            <p className="text-muted mb-0">
              No delivery payout records for the selected period.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Order Reference</th>
                  <th>Date & Time</th>
                  <th>Base Delivery Fee</th>
                  <th>Trip Incentive</th>
                  <th>Total Credited</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item, idx) => {
                  const orderRef = item.order?._id || item.order;
                  const orderRefStr = orderRef
                    ? `#${orderRef.toString().slice(-6).toUpperCase()}`
                    : `#TRIP-${idx + 1}`;

                  return (
                    <tr key={idx}>
                      <td>
                        <span className="badge bg-secondary rounded-pill">
                          {orderRefStr}
                        </span>
                      </td>
                      <td className="small text-muted">
                        {new Date(item.date).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td>₹{item.deliveryFee || 50}</td>
                      <td>₹{item.amount - (item.deliveryFee || 50) || 10}</td>
                      <td>
                        <strong className="text-success fs-6">
                          +₹{item.amount}
                        </strong>
                      </td>
                      <td>
                        <span className="badge bg-success-subtle text-success border border-success rounded-pill">
                          {item.status === "credited" ? "Credited ✓" : "Paid Out"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Earnings;

