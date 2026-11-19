import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faIndianRupeeSign,
  faChartLine,
  faShoppingBag,
  faUsers,
  faStore,
  faUtensils,
  faTicketAlt,
  faChartBar,
  faSearch,
  faFilter,
  faPlus,
  faCheckCircle,
  faClock,
  faTruck,
  faTimesCircle,
  faEllipsisV,
  faArrowUp,
  faArrowDown,
  faEye,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orderFilter, setOrderFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Delivery Partners Admin State
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [assigningPartner, setAssigningPartner] = useState(false);

  const fetchDeliveryPartners = async () => {
    try {
      setLoadingPartners(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("/api/v1/delivery/admin/partners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setDeliveryPartners(res.data.partners || []);
      }
    } catch (err) {
      console.warn("Fetch delivery partners error:", err.message);
    } finally {
      setLoadingPartners(false);
    }
  };

  useEffect(() => {
    fetchDeliveryPartners();
  }, []);

  const handleVerifyPartner = async (partnerId, status) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.put(
        `/api/v1/delivery/admin/partners/${partnerId}/verify`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        toast.success(`Partner ${status} successfully!`);
        fetchDeliveryPartners();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    }
  };

  const handleAssignOrder = async () => {
    if (!assignModalOrder || !selectedPartnerId) {
      toast.error("Please select a verified delivery partner");
      return;
    }
    try {
      setAssigningPartner(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.post(
        `/api/v1/delivery/admin/orders/${assignModalOrder.id || assignModalOrder._id}/assign`,
        { partnerId: selectedPartnerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        toast.success("Order assigned to delivery partner! 🛵");
        setAssignModalOrder(null);
        setSelectedPartnerId("");
        fetchDeliveryPartners();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Assignment failed");
    } finally {
      setAssigningPartner(false);
    }
  };

  // Sample State Data
  const [recentOrders, setRecentOrders] = useState([
    {
      id: "ORD-9821",
      customer: "Arya Karande",
      restaurant: "Pizza Palace",
      items: "2x Pepperoni Pizza, 1x Coke",
      amount: 750,
      paymentMethod: "Stripe Online",
      paymentStatus: "Paid",
      status: "Delivered",
      time: "10 mins ago",
    },
    {
      id: "ORD-9822",
      customer: "Priya Sharma",
      restaurant: "Burger Club",
      items: "1x Double Cheese Burger, Fries",
      amount: 420,
      paymentMethod: "Cash on Delivery",
      paymentStatus: "Pending",
      status: "Out for Delivery",
      time: "25 mins ago",
    },
    {
      id: "ORD-9823",
      customer: "Rohan Verma",
      restaurant: "Spice Garden",
      items: "1x Paneer Butter Masala, 3x Naan",
      amount: 580,
      paymentMethod: "Stripe Online",
      paymentStatus: "Paid",
      status: "Preparing",
      time: "35 mins ago",
    },
    {
      id: "ORD-9824",
      customer: "Sneha Patel",
      restaurant: "Biryani House",
      items: "2x Chicken Dum Biryani",
      amount: 690,
      paymentMethod: "Stripe Online",
      paymentStatus: "Paid",
      status: "Order Confirmed",
      time: "45 mins ago",
    },
    {
      id: "ORD-9825",
      customer: "Amit Deshmukh",
      restaurant: "Wok Express",
      items: "1x Hakka Noodle, 1x Veg Manchurian",
      amount: 390,
      paymentMethod: "Stripe Online",
      paymentStatus: "Paid",
      status: "Delivered",
      time: "1 hour ago",
    },
  ]);

  const [restaurants, setRestaurants] = useState([
    { id: 1, name: "Pizza Palace", category: "Italian & Fast Food", rating: 4.8, orders: 450, isVeg: false, active: true },
    { id: 2, name: "Burger Club", category: "American & Snacks", rating: 4.6, orders: 380, isVeg: false, active: true },
    { id: 3, name: "Spice Garden", category: "North Indian", rating: 4.7, orders: 520, isVeg: true, active: true },
    { id: 4, name: "Biryani House", category: "Hyderabadi & Mughlai", rating: 4.9, orders: 610, isVeg: false, active: true },
    { id: 5, name: "Green Salad Hub", category: "Healthy & Vegan", rating: 4.5, orders: 190, isVeg: true, active: false },
  ]);

  const [foodItems, setFoodItems] = useState([
    { id: 101, name: "Pepperoni Feast Pizza", restaurant: "Pizza Palace", price: 499, category: "Pizza", stock: 45, status: "In Stock" },
    { id: 102, name: "Paneer Butter Masala", restaurant: "Spice Garden", price: 320, category: "Curry", stock: 30, status: "In Stock" },
    { id: 103, name: "Chicken Dum Biryani", restaurant: "Biryani House", price: 380, category: "Biryani", stock: 60, status: "In Stock" },
    { id: 104, name: "Double Cheese Burger", restaurant: "Burger Club", price: 249, category: "Burger", stock: 0, status: "Out of Stock" },
  ]);

  const [users, setUsers] = useState([
    { id: "U-1", name: "Arya Karande", email: "aryak@gmail.com", role: "Customer", ordersCount: 14, status: "Active" },
    { id: "U-2", name: "Priya Sharma", email: "priya@gmail.com", role: "Customer", ordersCount: 8, status: "Active" },
    { id: "U-3", name: "Rahul Sharma", email: "rahul.driver@gmail.com", role: "Delivery Partner", ordersCount: 120, status: "Active" },
    { id: "U-4", name: "Admin Manager", email: "admin@foodapp.com", role: "Admin", ordersCount: 0, status: "Active" },
  ]);

  const [coupons, setCoupons] = useState([
    { code: "FOODIE20", discount: "20% OFF", minOrder: 300, maxDiscount: 100, used: 142, status: "Active" },
    { code: "WELCOME50", discount: "₹50 FLAT", minOrder: 199, maxDiscount: 50, used: 289, status: "Active" },
    { code: "FREEDEL", discount: "Free Delivery", minOrder: 250, maxDiscount: 55, used: 98, status: "Expired" },
  ]);

  const updateOrderStatusHandler = (orderId, newStatus) => {
    setRecentOrders(prev =>
      prev.map(ord => ord.id === orderId ? { ...ord, status: newStatus } : ord)
    );
    toast.success(`Order ${orderId} updated to "${newStatus}"`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Delivered":
        return <span className="badge bg-success text-white px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Delivered</span>;
      case "Out for Delivery":
        return <span className="badge bg-info text-dark px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faTruck} className="me-1" /> Out for Delivery</span>;
      case "Preparing":
        return <span className="badge bg-warning text-dark px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faClock} className="me-1" /> Preparing</span>;
      case "Order Confirmed":
        return <span className="badge bg-primary text-white px-3 py-2 rounded-pill"><FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Confirmed</span>;
      default:
        return <span className="badge bg-secondary text-white px-3 py-2 rounded-pill">{status}</span>;
    }
  };

  // Monthly Revenue Data for Chart
  const revenueChartData = [
    { month: "Jan", revenue: 145000, height: "45%" },
    { month: "Feb", revenue: 168000, height: "55%" },
    { month: "Mar", revenue: 182000, height: "62%" },
    { month: "Apr", revenue: 195000, height: "68%" },
    { month: "May", revenue: 215000, height: "78%" },
    { month: "Jun", revenue: 232000, height: "88%" },
    { month: "Jul", revenue: 248500, height: "100%" },
  ];

  return (
    <div className="admin-dashboard-container d-flex" style={{ minHeight: "88vh", background: "#f4f6f9" }}>
      {/* SIDEBAR */}
      <aside
        className={`bg-dark text-white p-3 shadow-lg transition-all ${sidebarOpen ? "col-md-2" : "col-auto"}`}
        style={{ minWidth: sidebarOpen ? "240px" : "80px", borderRadius: "16px 0 0 16px" }}
      >
        <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom border-secondary">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-3">🛡️</span>
            {sidebarOpen && <h5 className="fw-bold mb-0 text-warning">Admin Portal</h5>}
          </div>
          <button
            className="btn btn-sm btn-outline-light border-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="nav flex-column gap-2">
          {[
            { id: "dashboard", label: "Dashboard", icon: faChartLine },
            { id: "orders", label: "Orders", icon: faShoppingBag, badge: recentOrders.length },
            { id: "restaurants", label: "Restaurants", icon: faStore, badge: restaurants.length },
            { id: "foodItems", label: "Food Items", icon: faUtensils },
            { id: "users", label: "Users", icon: faUsers },
            { id: "deliveryPartners", label: "Delivery Partners", icon: faTruck, badge: deliveryPartners.length },
            { id: "coupons", label: "Coupons", icon: faTicketAlt },
            { id: "analytics", label: "Analytics", icon: faChartBar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-link text-start rounded-3 px-3 py-2.5 d-flex align-items-center justify-content-between border-0 transition-all ${
                activeTab === tab.id
                  ? "bg-warning text-dark fw-bold shadow-sm"
                  : "text-white-50 hover-white bg-transparent"
              }`}
              style={{ cursor: "pointer" }}
            >
              <div className="d-flex align-items-center gap-3">
                <FontAwesomeIcon icon={tab.icon} style={{ width: "20px" }} />
                {sidebarOpen && <span>{tab.label}</span>}
              </div>
              {sidebarOpen && tab.badge && (
                <span className={`badge ${activeTab === tab.id ? "bg-dark text-white" : "bg-warning text-dark"} rounded-pill`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow-1 p-4 overflow-auto">
        {/* TOP BAR */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h3 className="fw-bold text-dark mb-1">
              {activeTab === "dashboard" && "📊 Executive Dashboard"}
              {activeTab === "orders" && "📦 Orders Management"}
              {activeTab === "restaurants" && "🏪 Restaurant Partners"}
              {activeTab === "foodItems" && "🍕 Food Items & Inventory"}
              {activeTab === "users" && "👥 Registered Users & Drivers"}
              {activeTab === "deliveryPartners" && "🛵 Delivery Partners & Fleet Management"}
              {activeTab === "coupons" && "🎟️ Promotional Discounts & Coupons"}
              {activeTab === "analytics" && "📈 Sales & Performance Analytics"}
            </h3>
            <p className="text-muted small mb-0">Overview of real-time store performance, revenue, orders & users.</p>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="input-group shadow-sm" style={{ maxWidth: "260px" }}>
              <span className="input-group-text bg-white border-end-0">
                <FontAwesomeIcon icon={faSearch} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Link to="/" className="btn btn-outline-success rounded-pill fw-bold px-3">
              🌐 Live Store View
            </Link>
          </div>
        </div>

        {/* TAB 1: MAIN DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <>
            {/* STAT CARDS ROW */}
            <div className="row g-3 mb-4">
              {/* Revenue Card */}
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden border-start border-4 border-success">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <span className="text-muted small text-uppercase fw-bold">Total Revenue</span>
                      <h3 className="fw-extrabold text-dark mt-1 mb-0">
                        <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" /> 2,48,500
                      </h3>
                      <span className="badge bg-success-subtle text-success small mt-2">
                        <FontAwesomeIcon icon={faArrowUp} /> +18.4% this month
                      </span>
                    </div>
                    <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle">
                      <FontAwesomeIcon icon={faIndianRupeeSign} size="lg" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders Card */}
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden border-start border-4 border-warning">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <span className="text-muted small text-uppercase fw-bold">Total Orders</span>
                      <h3 className="fw-extrabold text-dark mt-1 mb-0">1,248</h3>
                      <span className="badge bg-warning-subtle text-warning-dark small mt-2">
                        <FontAwesomeIcon icon={faArrowUp} /> 45 Orders Today
                      </span>
                    </div>
                    <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-circle">
                      <FontAwesomeIcon icon={faShoppingBag} size="lg" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Users Card */}
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden border-start border-4 border-primary">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <span className="text-muted small text-uppercase fw-bold">Total Users</span>
                      <h3 className="fw-extrabold text-dark mt-1 mb-0">3,850</h3>
                      <span className="badge bg-primary-subtle text-primary small mt-2">
                        <FontAwesomeIcon icon={faArrowUp} /> +124 New Customers
                      </span>
                    </div>
                    <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">
                      <FontAwesomeIcon icon={faUsers} size="lg" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Restaurants Card */}
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden border-start border-4 border-danger">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <span className="text-muted small text-uppercase fw-bold">Active Partners</span>
                      <h3 className="fw-extrabold text-dark mt-1 mb-0">48 Stores</h3>
                      <span className="badge bg-danger-subtle text-danger small mt-2">
                        ⭐ 4.7 Avg Rating
                      </span>
                    </div>
                    <div className="p-3 bg-danger bg-opacity-10 text-danger rounded-circle">
                      <FontAwesomeIcon icon={faStore} size="lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CHARTS SECTION ROW */}
            <div className="row g-4 mb-4">
              {/* Revenue Growth Bar Chart */}
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-bold mb-0 text-dark">📈 Revenue Growth Trend (2026)</h5>
                    <span className="badge bg-light text-dark border">Monthly Sales (₹)</span>
                  </div>

                  {/* Visual CSS Bar Chart */}
                  <div className="d-flex align-items-end justify-content-between gap-2 pt-4 px-2" style={{ height: "220px" }}>
                    {revenueChartData.map((item, idx) => (
                      <div key={idx} className="d-flex flex-column align-items-center flex-grow-1 h-100 justify-content-end">
                        <div
                          className="bg-success rounded-top transition-all"
                          style={{
                            height: item.height,
                            width: "80%",
                            maxWidth: "45px",
                            background: "linear-gradient(180deg, #28a745 0%, #20c997 100%)",
                          }}
                          title={`₹${item.revenue.toLocaleString()}`}
                        />
                        <span className="small text-muted fw-bold mt-2">{item.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Status Breakdown Chart */}
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                  <h5 className="fw-bold mb-4 text-dark">📊 Order Status Breakdown</h5>

                  <div className="d-flex flex-column gap-3">
                    <div>
                      <div className="d-flex justify-content-between small fw-bold mb-1">
                        <span>Delivered</span>
                        <span className="text-success">1,180 (94%)</span>
                      </div>
                      <div className="progress" style={{ height: "8px" }}>
                        <div className="progress-bar bg-success" style={{ width: "94%" }} />
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between small fw-bold mb-1">
                        <span>Out for Delivery</span>
                        <span className="text-info">28 (2.5%)</span>
                      </div>
                      <div className="progress" style={{ height: "8px" }}>
                        <div className="progress-bar bg-info" style={{ width: "2.5%" }} />
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between small fw-bold mb-1">
                        <span>Preparing / Confirmed</span>
                        <span className="text-warning-dark">17 (1.5%)</span>
                      </div>
                      <div className="progress" style={{ height: "8px" }}>
                        <div className="progress-bar bg-warning" style={{ width: "1.5%" }} />
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between small fw-bold mb-1">
                        <span>Cancelled</span>
                        <span className="text-danger">23 (2%)</span>
                      </div>
                      <div className="progress" style={{ height: "8px" }}>
                        <div className="progress-bar bg-danger" style={{ width: "2%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RECENT ORDERS TABLE */}
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h5 className="fw-bold mb-0 text-dark">📦 Recent Live Orders</h5>
                <button className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={() => setActiveTab("orders")}>
                  View All Orders ➔
                </button>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Restaurant</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="fw-bold text-dark">{ord.id}</td>
                        <td>{ord.customer}</td>
                        <td><span className="badge bg-light text-dark border">{ord.restaurant}</span></td>
                        <td className="small text-muted" style={{ maxWidth: "200px" }}>{ord.items}</td>
                        <td className="fw-bold text-success">₹{ord.amount}</td>
                        <td>{getStatusBadge(ord.status)}</td>
                        <td>
                          <div className="dropdown">
                            <select
                              className="form-select form-select-sm border-secondary rounded-pill"
                              style={{ width: "140px", fontSize: "12px" }}
                              value={ord.status}
                              onChange={(e) => updateOrderStatusHandler(ord.id, e.target.value)}
                            >
                              <option value="Order Confirmed">Order Confirmed</option>
                              <option value="Preparing">Preparing</option>
                              <option value="Out for Delivery">Out for Delivery</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: ORDERS MANAGEMENT */}
        {activeTab === "orders" && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <h5 className="fw-bold mb-0">All Orders Listing</h5>
              <div className="d-flex gap-2">
                {["All", "Order Confirmed", "Preparing", "Out for Delivery", "Delivered"].map((stg) => (
                  <button
                    key={stg}
                    className={`btn btn-sm rounded-pill ${orderFilter === stg ? "btn-dark" : "btn-outline-secondary"}`}
                    onClick={() => setOrderFilter(stg)}
                  >
                    {stg}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Restaurant</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders
                    .filter((o) => orderFilter === "All" || o.status === orderFilter)
                    .map((ord) => (
                      <tr key={ord.id}>
                        <td className="fw-bold">{ord.id}</td>
                        <td>{ord.customer}</td>
                        <td>{ord.restaurant}</td>
                        <td>{ord.items}</td>
                        <td className="fw-bold text-success">₹{ord.amount}</td>
                        <td><span className="badge bg-success-subtle text-success">{ord.paymentStatus}</span></td>
                        <td>{getStatusBadge(ord.status)}</td>
                        <td>
                          <div className="d-flex gap-1 align-items-center">
                            <select
                              className="form-select form-select-sm"
                              value={ord.status}
                              onChange={(e) => updateOrderStatusHandler(ord.id, e.target.value)}
                            >
                              <option value="Order Confirmed">Order Confirmed</option>
                              <option value="Preparing">Preparing</option>
                              <option value="Out for Delivery">Out for Delivery</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                            <button
                              className="btn btn-warning btn-sm rounded-pill text-nowrap px-2 fw-bold"
                              title="Assign Delivery Partner"
                              onClick={() => {
                                setAssignModalOrder(ord);
                                setSelectedPartnerId("");
                              }}
                            >
                              🛵 Assign
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RESTAURANTS */}
        {activeTab === "restaurants" && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">Partner Restaurants</h5>
              <button className="btn btn-warning rounded-pill px-3 fw-bold" onClick={() => toast.info("Add Restaurant Modal")}>
                <FontAwesomeIcon icon={faPlus} className="me-1" /> Add Restaurant
              </button>
            </div>

            <div className="row g-3">
              {restaurants.map((rest) => (
                <div key={rest.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card border rounded-4 p-3 shadow-sm h-100">
                    <div className="d-flex justify-content-between align-items-start">
                      <h5 className="fw-bold text-dark mb-1">{rest.name}</h5>
                      <span className={`badge ${rest.isVeg ? "bg-success" : "bg-danger"}`}>
                        {rest.isVeg ? "Veg Only" : "Veg & Non-Veg"}
                      </span>
                    </div>
                    <p className="text-muted small mb-2">{rest.category}</p>
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                      <span className="small font-weight-bold text-warning">⭐ {rest.rating} ({rest.orders} Orders)</span>
                      <button className={`btn btn-sm ${rest.active ? "btn-outline-danger" : "btn-outline-success"} rounded-pill`}>
                        {rest.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FOOD ITEMS */}
        {activeTab === "foodItems" && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">Food Items & Inventory</h5>
              <button className="btn btn-success rounded-pill px-3 fw-bold" onClick={() => toast.info("Add Dish Modal")}>
                <FontAwesomeIcon icon={faPlus} className="me-1" /> Add Food Item
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Dish Name</th>
                    <th>Restaurant</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {foodItems.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td className="fw-bold">{item.name}</td>
                      <td>{item.restaurant}</td>
                      <td><span className="badge bg-light text-dark border">{item.category}</span></td>
                      <td className="fw-bold text-success">₹{item.price}</td>
                      <td>{item.stock} units</td>
                      <td>
                        <span className={`badge ${item.stock > 0 ? "bg-success" : "bg-danger"}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: USERS */}
        {activeTab === "users" && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-bold mb-4">User Accounts & Roles</h5>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Total Orders</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td className="fw-bold">{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === "Admin" ? "bg-danger" : u.role === "Delivery Partner" ? "bg-warning text-dark" : "bg-primary"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{u.ordersCount}</td>
                      <td><span className="badge bg-success">{u.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: DELIVERY PARTNERS */}
        {activeTab === "deliveryPartners" && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <div>
                <h5 className="fw-bold mb-0">🛵 Delivery Partners Fleet</h5>
                <p className="text-muted small mb-0">
                  Manage rider accounts, verify driver credentials, and monitor availability
                </p>
              </div>
              <button
                className="btn btn-outline-dark btn-sm rounded-pill px-3"
                onClick={fetchDeliveryPartners}
                disabled={loadingPartners}
              >
                🔄 {loadingPartners ? "Updating..." : "Refresh Fleet"}
              </button>
            </div>

            {loadingPartners ? (
              <div className="text-center py-5">
                <div className="spinner-border text-warning" role="status"></div>
                <p className="mt-2 text-muted small">Loading delivery partners...</p>
              </div>
            ) : deliveryPartners.length === 0 ? (
              <div className="text-center py-5">
                <div className="display-5 mb-2">🛵</div>
                <h6 className="fw-bold">No Delivery Partners Registered</h6>
                <p className="text-muted small">
                  Users can apply to become delivery partners from their profile or delivery panel.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Partner</th>
                      <th>Contact</th>
                      <th>Vehicle Info</th>
                      <th>Availability</th>
                      <th>Verification</th>
                      <th>Deliveries</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryPartners.map((dp) => (
                      <tr key={dp._id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={dp.user?.avatar?.url || "/images/images.png"}
                              alt={dp.user?.name}
                              className="rounded-circle border"
                              style={{ width: "38px", height: "38px", objectFit: "cover" }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                              }}
                            />
                            <div>
                              <strong className="text-dark d-block">{dp.user?.name || "Partner"}</strong>
                              <small className="text-muted">{dp.user?.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="small text-dark fw-bold">{dp.phone}</span>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border d-block text-start mb-1">
                            {dp.vehicleType}
                          </span>
                          <strong className="small text-uppercase">{dp.vehicleNumber}</strong>
                        </td>
                        <td>
                          {dp.isOnline ? (
                            <span className="badge bg-success-subtle text-success border border-success rounded-pill">
                              ● Online ({dp.availabilityStatus})
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary border rounded-pill">
                              ○ Offline
                            </span>
                          )}
                        </td>
                        <td>
                          {dp.verificationStatus === "approved" ? (
                            <span className="badge bg-success rounded-pill">✓ Approved</span>
                          ) : dp.verificationStatus === "pending" ? (
                            <span className="badge bg-warning text-dark rounded-pill">⏳ Pending Approval</span>
                          ) : (
                            <span className="badge bg-danger rounded-pill">✕ {dp.verificationStatus}</span>
                          )}
                        </td>
                        <td>
                          <strong className="text-dark">{dp.totalCompletedDeliveries || 0}</strong>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            {dp.verificationStatus !== "approved" ? (
                              <button
                                className="btn btn-sm btn-success rounded-pill px-2"
                                onClick={() => handleVerifyPartner(dp._id, "approved")}
                                title="Approve & Verify Driver"
                              >
                                Approve ✓
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill px-2"
                                onClick={() => handleVerifyPartner(dp._id, "suspended")}
                                title="Suspend Driver"
                              >
                                Suspend ✕
                              </button>
                            )}
                            {dp.verificationStatus === "pending" && (
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill px-2"
                                onClick={() => handleVerifyPartner(dp._id, "rejected")}
                                title="Reject Application"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: COUPONS */}
        {activeTab === "coupons" && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">Active Coupons & Discounts</h5>
              <button className="btn btn-primary rounded-pill px-3 fw-bold" onClick={() => toast.success("New Coupon Created!")}>
                <FontAwesomeIcon icon={faPlus} className="me-1" /> Create Coupon
              </button>
            </div>

            <div className="row g-3">
              {coupons.map((cp, idx) => (
                <div key={idx} className="col-12 col-md-4">
                  <div className="card border-dashed border-2 p-3 rounded-4 bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge bg-dark text-warning fs-6 px-3 py-2">{cp.code}</span>
                      <span className={`badge ${cp.status === "Active" ? "bg-success" : "bg-secondary"}`}>{cp.status}</span>
                    </div>
                    <h4 className="fw-bold text-success mt-3 mb-1">{cp.discount}</h4>
                    <p className="small text-muted mb-2">Min order ₹{cp.minOrder} | Max discount ₹{cp.maxDiscount}</p>
                    <div className="small text-dark fw-bold border-top pt-2">Used {cp.used} times</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-bold mb-3">📈 Sales & Performance Insights</h5>
            <div className="row g-4">
              <div className="col-md-6">
                <div className="p-4 rounded-4 bg-light border">
                  <h6 className="fw-bold">🔥 Top Selling Category</h6>
                  <p className="display-6 text-success fw-bold">Pizza & Biryani (68%)</p>
                  <p className="text-muted small">Highest revenue generating food categories this month.</p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-4 rounded-4 bg-light border">
                  <h6 className="fw-bold">⏰ Peak Ordering Hours</h6>
                  <p className="display-6 text-warning-dark fw-bold">8:00 PM - 10:30 PM</p>
                  <p className="text-muted small">Over 55% of daily orders are placed during dinner time.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ASSIGN PARTNER MODAL */}
      {assignModalOrder && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
              <div className="modal-header bg-dark text-white border-0 p-3">
                <h5 className="modal-title fw-bold mb-0">
                  🛵 Assign Delivery Partner
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setAssignModalOrder(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                <p className="small text-muted mb-3">
                  Assign order <strong>#{assignModalOrder.id || assignModalOrder._id}</strong> to an approved, online delivery partner.
                </p>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted">
                    Select Available Partner *
                  </label>
                  <select
                    className="form-select rounded-3"
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                  >
                    <option value="">-- Choose verified partner --</option>
                    {deliveryPartners
                      .filter((p) => p.verificationStatus === "approved")
                      .map((p) => (
                        <option
                          key={p._id}
                          value={p._id}
                          disabled={!p.isOnline || p.availabilityStatus === "busy"}
                        >
                          {p.user?.name || "Partner"} ({p.vehicleNumber}) — {p.isOnline ? (p.availabilityStatus === "busy" ? "Busy on delivery" : "Available") : "Offline"}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-50 rounded-pill"
                    onClick={() => setAssignModalOrder(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning w-50 rounded-pill fw-bold text-dark shadow-sm"
                    onClick={handleAssignOrder}
                    disabled={assigningPartner || !selectedPartnerId}
                  >
                    {assigningPartner ? "Assigning..." : "Confirm Assignment ✓"}
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

export default AdminDashboard;
