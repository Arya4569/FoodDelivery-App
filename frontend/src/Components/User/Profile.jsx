import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout, updateProfile, changePassword } from "../../redux/actions/userActions";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import api from "../../utils/api";
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
  faPlus,
  faCheckCircle,
  faClock,
  faTruck,
  faArrowUp,
  faUserCircle,
  faTimes,
  faExchangeAlt,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

const Profile = ({ defaultTab = "profile" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isAuthenticated, loading } = useSelector((state) => state.user || {});

  // Profile & Provider Mode Control
  const [mainTab, setMainTab] = useState(defaultTab === "admin" ? "admin" : "profile");
  const [adminTab, setAdminTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Edit Profile & Password Change State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phoneNumber: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  // Admin real data state
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminStats, setAdminStats] = useState({ totalOrders: 0, totalRevenue: 0, pendingOrders: 0 });

  React.useEffect(() => {
    if (!loading && !isAuthenticated && !localStorage.getItem("token")) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  // Fetch real admin orders when in admin tab
  useEffect(() => {
    if (mainTab === 'admin' && user?.role === 'admin') {
      api.get('/v1/eats/orders/admin/all')
        .then(res => {
          const orders = res.data.orders || [];
          setAdminOrders(orders);
          setAdminStats({
            totalOrders: orders.length,
            totalRevenue: res.data.totalAmount || 0,
            pendingOrders: orders.filter(o => o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled').length
          });
        })
        .catch(err => console.error('Admin orders fetch failed:', err.message));
    }
  }, [mainTab, user]);

  const handleEditStart = () => {
    setEditForm({ name: user?.name || '', phoneNumber: user?.phoneNumber || '' });
    setIsEditingProfile(true);
  };

  const handleProfileSave = async () => {
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    dispatch(updateProfile(editForm));
    setIsEditingProfile(false);
    toast.success('Profile updated successfully!');
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      toast.error('Please fill all password fields'); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast.error('New passwords do not match'); return;
    }
    setPwdLoading(true);
    const result = await dispatch(changePassword(passwordForm));
    setPwdLoading(false);
    if (result?.success !== false) {
      toast.success('Password changed successfully!');
      setIsChangingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } else {
      toast.error(result?.message || 'Password change failed');
    }
  };

  // Modals State
  const [showAddRestModal, setShowAddRestModal] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);

  // Form States
  const [newRest, setNewRest] = useState({
    name: "",
    category: "Fast Food & Italian",
    address: "",
    isVeg: false,
    image: "",
  });

  const [newFood, setNewFood] = useState({
    name: "",
    restaurant: "",
    category: "Pizza",
    price: "",
    stock: 20,
    image: "",
  });

  // Provider Data States
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
  ]);

  const [restaurants, setRestaurants] = useState([
    { id: 1, name: "Pizza Palace", category: "Italian & Fast Food", address: "Station Road, Mumbai", rating: 4.8, orders: 450, isVeg: false, image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80", active: true },
    { id: 2, name: "Burger Club", category: "American & Snacks", address: "MG Road, Pune", rating: 4.6, orders: 380, isVeg: false, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80", active: true },
    { id: 3, name: "Spice Garden", category: "North Indian", address: "Ring Road, Nagpur", rating: 4.7, orders: 520, isVeg: true, image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80", active: true },
  ]);

  const [foodItems, setFoodItems] = useState([
    { id: 101, name: "Pepperoni Feast Pizza", restaurant: "Pizza Palace", price: 499, category: "Pizza", stock: 45, status: "In Stock", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80" },
    { id: 102, name: "Paneer Butter Masala", restaurant: "Spice Garden", price: 320, category: "Curry", stock: 30, status: "In Stock", image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80" },
    { id: 103, name: "Chicken Dum Biryani", restaurant: "Biryani House", price: 380, category: "Biryani", stock: 60, status: "In Stock", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80" },
    { id: 104, name: "Double Cheese Burger", restaurant: "Burger Club", price: 249, category: "Burger", stock: 0, status: "Out of Stock", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80" },
  ]);

  const [usersList, setUsersList] = useState([
    { id: "U-1", name: "Arya Karande", email: "aryak@gmail.com", role: "Customer", ordersCount: 14, status: "Active" },
    { id: "U-2", name: "Priya Sharma", email: "priya@gmail.com", role: "Customer", ordersCount: 8, status: "Active" },
    { id: "U-3", name: "Rahul Sharma", email: "rahul.driver@gmail.com", role: "Delivery Partner", ordersCount: 120, status: "Active" },
  ]);

  const [coupons, setCoupons] = useState([
    { code: "FOODIE20", discount: "20% OFF", minOrder: 300, maxDiscount: 100, used: 142, status: "Active" },
    { code: "WELCOME50", discount: "₹50 FLAT", minOrder: 199, maxDiscount: 50, used: 289, status: "Active" },
    { code: "FREEDEL", discount: "Free Delivery", minOrder: 250, maxDiscount: 55, used: 98, status: "Expired" },
  ]);

  const logoutHandler = () => {
    dispatch(logout());
    navigate("/login");
  };

  // Add Restaurant Handler
  const handleAddRestaurant = (e) => {
    e.preventDefault();
    if (!newRest.name || !newRest.address) {
      toast.error("Please fill restaurant name and address");
      return;
    }
    const created = {
      id: Date.now(),
      name: newRest.name,
      category: newRest.category,
      address: newRest.address,
      rating: 5.0,
      orders: 0,
      isVeg: newRest.isVeg,
      image: newRest.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80",
      active: true,
    };
    setRestaurants([created, ...restaurants]);
    toast.success(`Restaurant "${newRest.name}" added successfully! 🎉`);
    setNewRest({ name: "", category: "Fast Food & Italian", address: "", isVeg: false, image: "" });
    setShowAddRestModal(false);
  };

  // Add Food Item Handler
  const handleAddFoodItem = (e) => {
    e.preventDefault();
    if (!newFood.name || !newFood.price) {
      toast.error("Please enter food item name and price");
      return;
    }
    const created = {
      id: Date.now(),
      name: newFood.name,
      restaurant: newFood.restaurant || (restaurants[0]?.name || "My Restaurant"),
      category: newFood.category,
      price: Number(newFood.price),
      stock: Number(newFood.stock) || 20,
      status: Number(newFood.stock) > 0 ? "In Stock" : "Out of Stock",
      image: newFood.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80",
    };
    setFoodItems([created, ...foodItems]);
    toast.success(`Food Item "${newFood.name}" added to menu successfully! 🍕`);
    setNewFood({ name: "", restaurant: "", category: "Pizza", price: "", stock: 20, image: "" });
    setShowAddFoodModal(false);
  };

  const updateOrderStatusHandler = (orderId, newStatus) => {
    setRecentOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    toast.info(`Order ${orderId} status updated to "${newStatus}"`);
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
    <div className="container-fluid my-4">
      {/* TOP HEADER: SWITCH TO PROVIDER / CUSTOMER MODE */}
      <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-white shadow-sm rounded-4 border">
        <div className="d-flex align-items-center gap-3">
          <img
            src={user?.avatar?.url || "/images/images.png"}
            alt="user"
            className="rounded-circle border"
            style={{ width: "50px", height: "50px", objectFit: "cover" }}
          />
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="fw-bold mb-0 text-dark">{user?.name || "Welcome User"}</h5>
              <span className={`badge ${mainTab === "admin" ? "bg-dark text-warning" : "bg-success"}`}>
                {mainTab === "admin" ? "👨‍🍳 Food Provider / Admin" : "👤 Customer"}
              </span>
            </div>
            <small className="text-muted">{user?.email}</small>
          </div>
        </div>

        {/* SWITCH TO PROVIDER BUTTON */}
        <div className="btn-group p-1 bg-light rounded-pill border shadow-sm">
          <button
            className={`btn rounded-pill px-4 fw-bold ${mainTab === "profile" ? "btn-success text-white shadow-sm" : "btn-light text-dark"}`}
            onClick={() => setMainTab("profile")}
          >
            <FontAwesomeIcon icon={faUserCircle} className="me-2" /> Customer Profile
          </button>
          <button
            className={`btn rounded-pill px-4 fw-bold ${mainTab === "admin" ? "btn-dark text-warning shadow-sm" : "btn-outline-dark"}`}
            onClick={() => {
              setMainTab("admin");
              toast.info("Switched to Provider / Admin Dashboard! 👨‍🍳");
            }}
          >
            <FontAwesomeIcon icon={faExchangeAlt} className="me-2" /> Switch to Provider
          </button>
        </div>
      </div>

      {/* MODE 1: CUSTOMER PROFILE VIEW */}
      {mainTab === "profile" && (
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="card shadow-sm border-0 rounded-4 p-4 bg-white">
              <div className="text-center pb-3 border-bottom mb-4">
                <img
                  src={user?.avatar?.url || "/images/images.png"}
                  alt="profile"
                  className="rounded-circle border border-3 border-success shadow-sm mb-3"
                  style={{ width: "100px", height: "100px", objectFit: "cover" }}
                />
                <h3 className="fw-bold text-dark">{user?.name}</h3>
                <p className="text-muted mb-1">{user?.email}</p>
                <p className="text-muted small">{user?.phoneNumber || "+91 98765 43210"}</p>
              </div>

              {/* Edit Profile Button */}
              {!isEditingProfile ? (
                <button className="btn btn-outline-warning btn-sm rounded-pill mt-2" onClick={handleEditStart}>
                  ✏️ Edit Profile
                </button>
              ) : (
                <div className="card border-0 shadow-sm rounded-4 p-3 mt-3 bg-white text-start">
                  <h6 className="fw-bold mb-3">Edit Profile</h6>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Full Name</label>
                    <input type="text" className="form-control rounded-3" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Phone Number</label>
                    <input type="tel" className="form-control rounded-3" value={editForm.phoneNumber} onChange={e => setEditForm({...editForm, phoneNumber: e.target.value})} />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-warning btn-sm rounded-pill fw-bold" onClick={handleProfileSave}>Save Changes</button>
                    <button className="btn btn-outline-secondary btn-sm rounded-pill" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Change Password Section */}
              {!isChangingPassword ? (
                <button className="btn btn-outline-secondary btn-sm rounded-pill mt-2 ms-2" onClick={() => setIsChangingPassword(true)}>
                  🔒 Change Password
                </button>
              ) : (
                <div className="card border-0 shadow-sm rounded-4 p-3 mt-3 bg-white text-start">
                  <h6 className="fw-bold mb-3">Change Password</h6>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Current Password</label>
                    <input type="password" className="form-control rounded-3" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">New Password</label>
                    <input type="password" className="form-control rounded-3" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Confirm New Password</label>
                    <input type="password" className="form-control rounded-3" value={passwordForm.confirmNewPassword} onChange={e => setPasswordForm({...passwordForm, confirmNewPassword: e.target.value})} />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-danger btn-sm rounded-pill fw-bold" onClick={handlePasswordChange} disabled={pwdLoading}>
                      {pwdLoading ? '⌛ Saving...' : '🔒 Update Password'}
                    </button>
                    <button className="btn btn-outline-secondary btn-sm rounded-pill" onClick={() => setIsChangingPassword(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* QUICK ACTION CARDS */}
              <div className="row g-3 mb-4">
                {(user?.role === "restaurant_owner" || user?.role === "owner" || user?.role === "admin") ? (
                  <div className="col-md-6 col-lg-3">
                    <Link to="/owner/dashboard" className="text-decoration-none">
                      <div
                        className="p-3 rounded-4 text-center border shadow-sm transition-all text-white"
                        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", cursor: "pointer" }}
                      >
                        <div className="fs-2">👨‍🍳</div>
                        <div className="fw-bold mt-2">Owner Panel</div>
                        <small>Manage Menu & Orders</small>
                      </div>
                    </Link>
                  </div>
                ) : (
                  <div className="col-md-6 col-lg-3">
                    <div
                      className="p-3 rounded-4 text-center border shadow-sm transition-all text-white"
                      style={{ background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", cursor: "pointer" }}
                      onClick={() => {
                        setMainTab("admin");
                        toast.info("Welcome to Provider Dashboard! 👨‍🍳");
                      }}
                    >
                      <div className="fs-2">👨‍🍳</div>
                      <div className="fw-bold mt-2">Switch to Provider</div>
                      <small>Add Restaurant & Foods</small>
                    </div>
                  </div>
                )}

                <div className="col-md-6 col-lg-3">
                  <Link to="/orders" className="text-decoration-none">
                    <div className="p-3 rounded-4 bg-light text-center border hover-shadow transition-all">
                      <div className="fs-2">📦</div>
                      <div className="fw-bold text-dark mt-2">Track Orders</div>
                      <small className="text-muted">Live status & history</small>
                    </div>
                  </Link>
                </div>

                <div className="col-md-6 col-lg-3">
                  <Link to="/wishlist" className="text-decoration-none">
                    <div className="p-3 rounded-4 bg-light text-center border hover-shadow transition-all">
                      <div className="fs-2">❤️</div>
                      <div className="fw-bold text-dark mt-2">My Wishlist</div>
                      <small className="text-muted">Saved dishes & stores</small>
                    </div>
                  </Link>
                </div>

                <div className="col-md-6 col-lg-3">
                  <Link to="/cart" className="text-decoration-none">
                    <div className="p-3 rounded-4 bg-light text-center border hover-shadow transition-all">
                      <div className="fs-2">🛒</div>
                      <div className="fw-bold text-dark mt-2">My Cart</div>
                      <small className="text-muted">Checkout items</small>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="d-flex justify-content-end border-top pt-3">
                <button className="btn btn-danger rounded-pill px-4 fw-bold" onClick={logoutHandler}>
                  Logout Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: PROVIDER / ADMIN DASHBOARD VIEW */}
      {mainTab === "admin" && (
        <div className="admin-dashboard-container d-flex rounded-4 overflow-hidden shadow-sm" style={{ minHeight: "82vh", background: "#f8f9fa" }}>
          {/* SIDEBAR */}
          <aside
            className={`bg-dark text-white p-3 transition-all ${sidebarOpen ? "col-md-2" : "col-auto"}`}
            style={{ minWidth: sidebarOpen ? "230px" : "70px" }}
          >
            <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom border-secondary">
              <div className="d-flex align-items-center gap-2">
                <span className="fs-4">👨‍🍳</span>
                {sidebarOpen && <h6 className="fw-bold mb-0 text-warning">Provider Portal</h6>}
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
                { id: "restaurants", label: "Restaurants", icon: faStore, badge: restaurants.length },
                { id: "foodItems", label: "Food Items & Menu", icon: faUtensils, badge: foodItems.length },
                { id: "orders", label: "Orders", icon: faShoppingBag, badge: recentOrders.length },
                { id: "users", label: "Users & Staff", icon: faUsers },
                { id: "coupons", label: "Coupons", icon: faTicketAlt },
                { id: "analytics", label: "Analytics", icon: faChartBar },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id)}
                  className={`nav-link text-start rounded-3 px-3 py-2 d-flex align-items-center justify-content-between border-0 transition-all ${
                    adminTab === tab.id
                      ? "bg-warning text-dark fw-bold shadow-sm"
                      : "text-white-50 hover-white bg-transparent"
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <FontAwesomeIcon icon={tab.icon} style={{ width: "18px" }} />
                    {sidebarOpen && <span>{tab.label}</span>}
                  </div>
                  {sidebarOpen && tab.badge && (
                    <span className={`badge ${adminTab === tab.id ? "bg-dark text-white" : "bg-warning text-dark"} rounded-pill`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* MAIN PROVIDER DASHBOARD CONTENT */}
          <main className="flex-grow-1 p-4 overflow-auto">
            {/* PROVIDER PROFILE & QUICK ADD BAR */}
            <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-gradient bg-dark text-white">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <img
                    src={user?.avatar?.url || "/images/images.png"}
                    alt="provider"
                    className="rounded-circle border border-2 border-warning"
                    style={{ width: "56px", height: "56px", objectFit: "cover" }}
                  />
                  <div>
                    <h5 className="fw-bold mb-0 text-white">{user?.name} (Provider Profile)</h5>
                    <small className="text-warning">Manage Restaurants, Menus, Food Items & Live Orders</small>
                  </div>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn btn-warning rounded-pill px-3 fw-bold text-dark d-flex align-items-center gap-1 shadow-sm"
                    onClick={() => setShowAddRestModal(true)}
                  >
                    <FontAwesomeIcon icon={faPlus} /> Add Restaurant
                  </button>
                  <button
                    className="btn btn-success rounded-pill px-3 fw-bold text-white d-flex align-items-center gap-1 shadow-sm"
                    onClick={() => setShowAddFoodModal(true)}
                  >
                    <FontAwesomeIcon icon={faPlus} /> Add Food Item / Menu
                  </button>
                </div>
              </div>
            </div>

            {/* TAB 1: MAIN DASHBOARD OVERVIEW */}
            {adminTab === "dashboard" && (
              <>
                {/* METRIC CARDS ROW */}
                <div className="row g-3 mb-4">
                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 border-start border-4 border-success">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <span className="text-muted small text-uppercase fw-bold">Total Revenue</span>
                          <h4 className="fw-extrabold text-dark mt-1 mb-0">
                            <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" /> 2,48,500
                          </h4>
                          <span className="badge bg-success-subtle text-success small mt-2">
                            <FontAwesomeIcon icon={faArrowUp} /> +18.4% Growth
                          </span>
                        </div>
                        <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle">
                          <FontAwesomeIcon icon={faIndianRupeeSign} size="lg" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 border-start border-4 border-warning">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <span className="text-muted small text-uppercase fw-bold">Total Orders</span>
                          <h4 className="fw-extrabold text-dark mt-1 mb-0">{recentOrders.length + 1240}</h4>
                          <span className="badge bg-warning-subtle text-warning-dark small mt-2">
                            45 Today
                          </span>
                        </div>
                        <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-circle">
                          <FontAwesomeIcon icon={faShoppingBag} size="lg" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 border-start border-4 border-primary">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <span className="text-muted small text-uppercase fw-bold">My Restaurants</span>
                          <h4 className="fw-extrabold text-dark mt-1 mb-0">{restaurants.length} Stores</h4>
                          <span className="badge bg-primary-subtle text-primary small mt-2">
                            Active Outlets
                          </span>
                        </div>
                        <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">
                          <FontAwesomeIcon icon={faStore} size="lg" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 border-start border-4 border-danger">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <span className="text-muted small text-uppercase fw-bold">Total Food Items</span>
                          <h4 className="fw-extrabold text-dark mt-1 mb-0">{foodItems.length} Dishes</h4>
                          <span className="badge bg-danger-subtle text-danger small mt-2">
                            In Menu List
                          </span>
                        </div>
                        <div className="p-3 bg-danger bg-opacity-10 text-danger rounded-circle">
                          <FontAwesomeIcon icon={faUtensils} size="lg" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CHARTS ROW */}
                <div className="row g-4 mb-4">
                  <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                      <h5 className="fw-bold mb-4 text-dark">📈 Revenue Growth Trend</h5>
                      <div className="d-flex align-items-end justify-content-between gap-2 pt-4 px-2" style={{ height: "200px" }}>
                        {revenueChartData.map((item, idx) => (
                          <div key={idx} className="d-flex flex-column align-items-center flex-grow-1 h-100 justify-content-end">
                            <div
                              className="bg-success rounded-top"
                              style={{
                                height: item.height,
                                width: "80%",
                                maxWidth: "40px",
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

                  <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                      <h5 className="fw-bold mb-4 text-dark">📊 Order Status Chart</h5>
                      <div className="d-flex flex-column gap-3">
                        <div>
                          <div className="d-flex justify-content-between small fw-bold mb-1">
                            <span>Delivered</span>
                            <span className="text-success">94%</span>
                          </div>
                          <div className="progress" style={{ height: "8px" }}>
                            <div className="progress-bar bg-success" style={{ width: "94%" }} />
                          </div>
                        </div>

                        <div>
                          <div className="d-flex justify-content-between small fw-bold mb-1">
                            <span>Out for Delivery</span>
                            <span className="text-info">4.5%</span>
                          </div>
                          <div className="progress" style={{ height: "8px" }}>
                            <div className="progress-bar bg-info" style={{ width: "4.5%" }} />
                          </div>
                        </div>

                        <div>
                          <div className="d-flex justify-content-between small fw-bold mb-1">
                            <span>Preparing</span>
                            <span className="text-warning">1.5%</span>
                          </div>
                          <div className="progress" style={{ height: "8px" }}>
                            <div className="progress-bar bg-warning" style={{ width: "1.5%" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RECENT ORDERS TABLE */}
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0 text-dark">📦 Recent Customer Orders</h5>
                    <button className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={() => setAdminTab("orders")}>
                      View All ➔
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
                          <th>Update Status</th>
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
                              <select
                                className="form-select form-select-sm rounded-pill"
                                style={{ width: "140px", fontSize: "12px" }}
                                value={ord.status}
                                onChange={(e) => updateOrderStatusHandler(ord.id, e.target.value)}
                              >
                                <option value="Order Confirmed">Order Confirmed</option>
                                <option value="Preparing">Preparing</option>
                                <option value="Out for Delivery">Out for Delivery</option>
                                <option value="Delivered">Delivered</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: RESTAURANTS (WITH ADD RESTAURANT ACTION) */}
            {adminTab === "restaurants" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <h5 className="fw-bold mb-0">🏪 Partner Restaurants</h5>
                  <button className="btn btn-warning text-dark fw-bold rounded-pill px-4 shadow-sm" onClick={() => setShowAddRestModal(true)}>
                    <FontAwesomeIcon icon={faPlus} className="me-1" /> Add Restaurant
                  </button>
                </div>

                <div className="row g-3">
                  {restaurants.map((rest) => (
                    <div key={rest.id} className="col-12 col-md-6 col-lg-4">
                      <div className="card border rounded-4 overflow-hidden shadow-sm h-100">
                        <img src={rest.image} alt={rest.name} style={{ height: "140px", objectFit: "cover" }} />
                        <div className="p-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <h5 className="fw-bold text-dark mb-1">{rest.name}</h5>
                            <span className={`badge ${rest.isVeg ? "bg-success" : "bg-danger"}`}>
                              {rest.isVeg ? "Veg" : "Veg & Non-Veg"}
                            </span>
                          </div>
                          <p className="text-muted small mb-1">{rest.category}</p>
                          <p className="text-secondary small mb-2">{rest.address}</p>
                          <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                            <span className="small text-warning font-weight-bold">⭐ {rest.rating} ({rest.orders} Orders)</span>
                            <span className="badge bg-success-subtle text-success">Active Store</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: FOOD ITEMS & MENU (WITH ADD FOOD ITEM ACTION) */}
            {adminTab === "foodItems" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <h5 className="fw-bold mb-0">🍕 Food Items & Menu Inventory</h5>
                  <button className="btn btn-success text-white fw-bold rounded-pill px-4 shadow-sm" onClick={() => setShowAddFoodModal(true)}>
                    <FontAwesomeIcon icon={faPlus} className="me-1" /> Add Food Item / Menu
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Dish Image</th>
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
                          <td>
                            <img src={item.image} alt={item.name} className="rounded-3" style={{ width: "48px", height: "48px", objectFit: "cover" }} />
                          </td>
                          <td className="fw-bold">{item.name}</td>
                          <td><span className="badge bg-light text-dark border">{item.restaurant}</span></td>
                          <td><span className="badge bg-secondary-subtle text-dark">{item.category}</span></td>
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

            {/* TAB 4: ORDERS */}
            {adminTab === "orders" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <h5 className="fw-bold mb-3">All Provider Orders</h5>
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Restaurant</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Update Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((ord) => (
                        <tr key={ord.id}>
                          <td className="fw-bold">{ord.id}</td>
                          <td>{ord.customer}</td>
                          <td>{ord.restaurant}</td>
                          <td>{ord.items}</td>
                          <td className="fw-bold text-success">₹{ord.amount}</td>
                          <td>{getStatusBadge(ord.status)}</td>
                          <td>
                            <select
                              className="form-select form-select-sm rounded-pill"
                              style={{ width: "140px" }}
                              value={ord.status}
                              onChange={(e) => updateOrderStatusHandler(ord.id, e.target.value)}
                            >
                              <option value="Order Confirmed">Order Confirmed</option>
                              <option value="Preparing">Preparing</option>
                              <option value="Out for Delivery">Out for Delivery</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: USERS */}
            {adminTab === "users" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <h5 className="fw-bold mb-3">Users & Delivery Partners</h5>
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td className="fw-bold">{u.name}</td>
                          <td>{u.email}</td>
                          <td><span className="badge bg-primary">{u.role}</span></td>
                          <td><span className="badge bg-success">{u.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: COUPONS */}
            {adminTab === "coupons" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <h5 className="fw-bold mb-3">Store Coupons & Discounts</h5>
                <div className="row g-3">
                  {coupons.map((cp, idx) => (
                    <div key={idx} className="col-12 col-md-4">
                      <div className="card border p-3 rounded-4 bg-light">
                        <span className="badge bg-dark text-warning fs-6 mb-2">{cp.code}</span>
                        <h4 className="fw-bold text-success mb-1">{cp.discount}</h4>
                        <p className="small text-muted mb-0">Min Order ₹{cp.minOrder} | Used {cp.used} times</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 7: ANALYTICS */}
            {adminTab === "analytics" && (
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <h5 className="fw-bold mb-3">📈 Store Sales & Performance Analytics</h5>
                <p className="text-muted">Top category: <strong>Pizza & Biryani (68%)</strong> | Peak Hours: <strong>8:00 PM - 10:30 PM</strong></p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* MODAL 1: ADD RESTAURANT */}
      {showAddRestModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-dark text-white rounded-top-4">
                <h5 className="modal-title fw-bold text-warning">🏪 Add New Restaurant Partner</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddRestModal(false)} />
              </div>
              <form onSubmit={handleAddRestaurant}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Restaurant Name *</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g. Royal Spice Kitchen"
                      required
                      value={newRest.name}
                      onChange={(e) => setNewRest({ ...newRest, name: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Cuisine / Category</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g. North Indian & Mughlai"
                      value={newRest.category}
                      onChange={(e) => setNewRest({ ...newRest, category: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Address *</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g. 45 MG Road, Mumbai"
                      required
                      value={newRest.address}
                      onChange={(e) => setNewRest({ ...newRest, address: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Image URL (Optional)</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="https://images.unsplash.com/..."
                      value={newRest.image}
                      onChange={(e) => setNewRest({ ...newRest, image: e.target.value })}
                    />
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="vegSwitch"
                      checked={newRest.isVeg}
                      onChange={(e) => setNewRest({ ...newRest, isVeg: e.target.checked })}
                    />
                    <label className="form-check-label fw-bold" htmlFor="vegSwitch">
                      Pure Veg Restaurant Only 🌿
                    </label>
                  </div>
                </div>

                <div className="modal-footer bg-light rounded-bottom-4">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-3" onClick={() => setShowAddRestModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning fw-bold text-dark rounded-pill px-4">
                    Save Restaurant 🎉
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD FOOD ITEM / MENU */}
      {showAddFoodModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-dark text-white rounded-top-4">
                <h5 className="modal-title fw-bold text-warning">🍕 Add New Food Item / Menu</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddFoodModal(false)} />
              </div>
              <form onSubmit={handleAddFoodItem}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Dish Name *</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g. Cheese Burst Margherita Pizza"
                      required
                      value={newFood.name}
                      onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Select Restaurant</label>
                    <select
                      className="form-select rounded-3"
                      value={newFood.restaurant}
                      onChange={(e) => setNewFood({ ...newFood, restaurant: e.target.value })}
                    >
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-bold">Price (₹) *</label>
                      <input
                        type="number"
                        className="form-control rounded-3"
                        placeholder="299"
                        required
                        value={newFood.price}
                        onChange={(e) => setNewFood({ ...newFood, price: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold">Initial Stock</label>
                      <input
                        type="number"
                        className="form-control rounded-3"
                        placeholder="20"
                        value={newFood.stock}
                        onChange={(e) => setNewFood({ ...newFood, stock: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Category</label>
                    <select
                      className="form-select rounded-3"
                      value={newFood.category}
                      onChange={(e) => setNewFood({ ...newFood, category: e.target.value })}
                    >
                      <option value="Pizza">Pizza</option>
                      <option value="Burger">Burger</option>
                      <option value="Biryani">Biryani</option>
                      <option value="Curry">Curry & Main Course</option>
                      <option value="Dessert">Dessert & Drinks</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Image URL (Optional)</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="https://images.unsplash.com/..."
                      value={newFood.image}
                      onChange={(e) => setNewFood({ ...newFood, image: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light rounded-bottom-4">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-3" onClick={() => setShowAddFoodModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success fw-bold text-white rounded-pill px-4">
                    Add to Menu 🍕
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;