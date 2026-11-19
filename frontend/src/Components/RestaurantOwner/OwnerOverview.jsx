import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faIndianRupeeSign,
  faShoppingBag,
  faClock,
  faCheckCircle,
  faCalendarDay,
  faStore,
  faUtensils,
  faArrowRight,
  faExclamationTriangle,
  faEye,
  faFire,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";

const OwnerOverview = ({
  stats,
  loading,
  error,
  onRefresh,
  onNavigateTab,
  onSelectOrder,
}) => {
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
        <p className="text-muted mt-3">Fetching real-time restaurant statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger rounded-4 p-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3">
          <FontAwesomeIcon icon={faExclamationTriangle} className="fs-3 text-danger" />
          <div>
            <h6 className="fw-bold mb-1">Failed to Load Dashboard Statistics</h6>
            <p className="mb-0 small text-danger">{error}</p>
          </div>
        </div>
        <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={onRefresh}>
          Retry
        </button>
      </div>
    );
  }

  const {
    totalOrders = 0,
    todayOrders = 0,
    pendingOrders = 0,
    completedOrders = 0,
    cancelledOrders = 0,
    totalRevenue = 0,
    recentOrders = [],
    topSellingItems = [],
    totalDishes = 0,
    activeRestaurants = 0,
  } = stats || {};

  const getStatusBadge = (status) => {
    switch (status) {
      case "Order Confirmed":
        return <span className="badge badge-status-confirmed px-2.5 py-1.5 rounded-pill">Confirmed</span>;
      case "Preparing":
        return <span className="badge badge-status-preparing px-2.5 py-1.5 rounded-pill">Preparing</span>;
      case "Ready for Pickup":
        return <span className="badge badge-status-pickup px-2.5 py-1.5 rounded-pill">Ready for Pickup</span>;
      case "Out for Delivery":
        return <span className="badge badge-status-out px-2.5 py-1.5 rounded-pill">Out for Delivery</span>;
      case "Delivered":
        return <span className="badge badge-status-delivered px-2.5 py-1.5 rounded-pill">Delivered</span>;
      case "Cancelled":
      case "Rejected":
        return <span className="badge badge-status-cancelled px-2.5 py-1.5 rounded-pill">{status}</span>;
      default:
        return <span className="badge bg-secondary px-2.5 py-1.5 rounded-pill">{status}</span>;
    }
  };

  return (
    <div className="owner-overview">
      {/* Top Banner */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold text-dark mb-1">📊 Restaurant Performance Overview</h4>
          <p className="text-muted small mb-0">
            Real-time analytics aggregated directly from your MongoDB database records.
          </p>
        </div>
        <button
          className="btn btn-outline-dark btn-sm rounded-pill px-3 fw-semibold"
          onClick={onRefresh}
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* METRIC CARDS ROW */}
      <div className="row g-3 mb-4">
        {/* Total Revenue */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="owner-stat-card h-100 border-start border-4 border-success">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted small text-uppercase fw-bold">Total Revenue</span>
                <h3 className="fw-bold text-dark mt-2 mb-0">
                  <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" /> {totalRevenue.toLocaleString()}
                </h3>
                <small className="text-success fw-semibold mt-1 d-block">
                  From paid & delivered orders
                </small>
              </div>
              <div className="owner-icon-box bg-success bg-opacity-10 text-success">
                <FontAwesomeIcon icon={faIndianRupeeSign} size="lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="owner-stat-card h-100 border-start border-4 border-primary">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted small text-uppercase fw-bold">Total Orders</span>
                <h3 className="fw-bold text-dark mt-2 mb-0">{totalOrders}</h3>
                <small className="text-primary fw-semibold mt-1 d-block">
                  Lifetime restaurant orders
                </small>
              </div>
              <div className="owner-icon-box bg-primary bg-opacity-10 text-primary">
                <FontAwesomeIcon icon={faShoppingBag} size="lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Today's Orders */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="owner-stat-card h-100 border-start border-4 border-warning">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted small text-uppercase fw-bold">Today's Orders</span>
                <h3 className="fw-bold text-dark mt-2 mb-0">{todayOrders}</h3>
                <small className="text-warning-dark fw-semibold mt-1 d-block">
                  Placed since 00:00 today
                </small>
              </div>
              <div className="owner-icon-box bg-warning bg-opacity-10 text-warning">
                <FontAwesomeIcon icon={faCalendarDay} size="lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="owner-stat-card h-100 border-start border-4 border-danger">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted small text-uppercase fw-bold">Pending Orders</span>
                <h3 className="fw-bold text-dark mt-2 mb-0">{pendingOrders}</h3>
                <small className="text-danger fw-semibold mt-1 d-block">
                  Awaiting kitchen / pickup
                </small>
              </div>
              <div className="owner-icon-box bg-danger bg-opacity-10 text-danger">
                <FontAwesomeIcon icon={faClock} size="lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY METRICS / STATUS SUMMARY */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="p-3 bg-white rounded-4 border text-center">
            <span className="text-muted small d-block mb-1">Delivered Orders</span>
            <h5 className="fw-bold text-success mb-0">{completedOrders}</h5>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="p-3 bg-white rounded-4 border text-center">
            <span className="text-muted small d-block mb-1">Cancelled / Rejected</span>
            <h5 className="fw-bold text-danger mb-0">{cancelledOrders}</h5>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="p-3 bg-white rounded-4 border text-center">
            <span className="text-muted small d-block mb-1">Menu Items</span>
            <h5 className="fw-bold text-primary mb-0">{totalDishes} Dishes</h5>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="p-3 bg-white rounded-4 border text-center">
            <span className="text-muted small d-block mb-1">Active Outlets</span>
            <h5 className="fw-bold text-dark mb-0">{activeRestaurants} Open</h5>
          </div>
        </div>
      </div>

      {/* TOP SELLING DISHES & RECENT ORDERS */}
      <div className="row g-4 mb-4">
        {/* Top Selling Food Items */}
        <div className="col-lg-5">
          <div className="owner-table-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faFire} className="text-danger" />
                Top-Selling Food Items
              </h5>
              <button
                className="btn btn-sm btn-link text-decoration-none text-primary fw-semibold p-0"
                onClick={() => onNavigateTab("menu")}
              >
                View Menu <FontAwesomeIcon icon={faArrowRight} size="xs" />
              </button>
            </div>

            {topSellingItems.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <FontAwesomeIcon icon={faUtensils} className="fs-2 text-secondary mb-2" />
                <p className="small mb-0">No sales recorded yet for food items.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {topSellingItems.map((item, index) => (
                  <div
                    key={index}
                    className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-light border"
                  >
                    <div className="d-flex align-items-center gap-3">
                      <span className="badge bg-dark text-warning rounded-pill">#{index + 1}</span>
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="rounded-3"
                          style={{ width: "42px", height: "42px", objectFit: "cover" }}
                        />
                      )}
                      <div>
                        <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "14px" }}>
                          {item.name}
                        </h6>
                        <small className="text-muted">{item.quantity} units sold</small>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="fw-bold text-success" style={{ fontSize: "14px" }}>
                        ₹{item.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="col-lg-7">
          <div className="owner-table-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faShoppingBag} className="text-warning" />
                Recent Orders
              </h5>
              <button
                className="btn btn-sm btn-outline-primary rounded-pill px-3"
                onClick={() => onNavigateTab("orders")}
              >
                Manage All Orders <FontAwesomeIcon icon={faArrowRight} size="xs" />
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FontAwesomeIcon icon={faShoppingBag} className="fs-1 text-secondary mb-2" />
                <h6 className="fw-bold text-dark mt-2">No Orders Placed Yet</h6>
                <p className="small text-muted mb-0">
                  When customers order from your restaurant, live details will appear here.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ fontSize: "12px" }}>Order ID</th>
                      <th style={{ fontSize: "12px" }}>Customer</th>
                      <th style={{ fontSize: "12px" }}>Items</th>
                      <th style={{ fontSize: "12px" }}>Amount</th>
                      <th style={{ fontSize: "12px" }}>Status</th>
                      <th style={{ fontSize: "12px" }} className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((ord) => (
                      <tr key={ord._id}>
                        <td>
                          <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                            #{ord._id.slice(-6).toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: "13px" }} className="fw-semibold text-dark">
                            {ord.user?.name || "Customer"}
                          </div>
                          <small className="text-muted d-block" style={{ fontSize: "11px" }}>
                            {ord.deliveryInfo?.city || "Local"}
                          </small>
                        </td>
                        <td style={{ maxWidth: "160px" }}>
                          <span
                            className="text-truncate d-block small text-muted"
                            title={ord.orderItems?.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                          >
                            {ord.orderItems?.map((i) => `${i.quantity}x ${i.name}`).join(", ") || "-"}
                          </span>
                        </td>
                        <td>
                          <span className="fw-bold text-success" style={{ fontSize: "13px" }}>
                            ₹{ord.finalTotal}
                          </span>
                        </td>
                        <td>{getStatusBadge(ord.orderStatus)}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-dark rounded-pill px-2.5 py-1"
                            style={{ fontSize: "11px" }}
                            onClick={() => {
                              if (onSelectOrder) onSelectOrder(ord);
                              onNavigateTab("orders");
                            }}
                          >
                            <FontAwesomeIcon icon={faEye} className="me-1" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerOverview;

