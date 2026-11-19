import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../../redux/actions/userActions";
import api from "../../utils/api";
import { useSocket } from "../../context/SocketContext";
import "./owner.css";

import OwnerSidebar from "./OwnerSidebar";
import OwnerOverview from "./OwnerOverview";
import RestaurantManagement from "./RestaurantManagement";
import MenuManagement from "./MenuManagement";
import OrderManagement from "./OrderManagement";
import AddRestaurantModal from "./AddRestaurantModal";

const OwnerDashboard = ({ initialTab = "overview" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, isAuthenticated, loading: authLoading } = useSelector(
    (state) => state.user || {}
  );

  // Determine active tab from URL query param (?tab=...) or prop
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || initialTab || "overview";
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Real-time Owner Data States
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  // Selected Order for direct view from Overview
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Modal State
  const [isAddRestModalOpen, setIsAddRestModalOpen] = useState(false);

  // Enforce authentication & role protection
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user) {
        navigate("/login");
        return;
      }
      const allowed = ["restaurant_owner", "owner", "admin"];
      if (!allowed.includes(user.role)) {
        navigate("/");
      }
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  // Sync tab with URL if location changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["overview", "restaurant", "menu", "orders"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Fetch Owner's Restaurants
  const fetchRestaurants = async () => {
    try {
      const { data } = await api.get("/v1/owner/restaurants");
      const list = data.restaurants || [];
      setRestaurants(list);
      if (list.length > 0 && !selectedRestaurantId) {
        setSelectedRestaurantId(list[0]._id);
      }
    } catch (err) {
      console.error("Failed to load owner restaurants:", err.message);
    }
  };

  // Fetch Dashboard Statistics from database
  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const query = selectedRestaurantId ? `?restaurantId=${selectedRestaurantId}` : "";
      const { data } = await api.get(`/v1/owner/dashboard${query}`);
      setStats(data.stats || null);
    } catch (err) {
      setStatsError(
        err.response?.data?.message || "Failed to load restaurant dashboard stats"
      );
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRestaurants();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardStats();
    }
  }, [isAuthenticated, selectedRestaurantId]);

  const { socket, isConnected } = useSocket();

  // Refresh dashboard metrics when live order events occur
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleRefreshStats = () => {
      fetchDashboardStats();
    };

    socket.on("order:created", handleRefreshStats);
    socket.on("order:status_updated", handleRefreshStats);

    return () => {
      socket.off("order:created", handleRefreshStats);
      socket.off("order:status_updated", handleRefreshStats);
    };
  }, [socket, isConnected, selectedRestaurantId]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleRestaurantCreated = (newRest) => {
    setRestaurants((prev) => [newRest, ...prev]);
    setSelectedRestaurantId(newRest._id);
    fetchDashboardStats();
  };

  const handleRestaurantUpdated = (updatedRest) => {
    setRestaurants((prev) =>
      prev.map((r) => (r._id === updatedRest._id ? updatedRest : r))
    );
    fetchDashboardStats();
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/owner/dashboard?tab=${tabId}`, { replace: true });
  };

  return (
    <div className="container-fluid my-3 px-2 px-md-4">
      <div className="owner-container d-flex shadow-sm border">
        {/* SIDEBAR NAVIGATION */}
        <OwnerSidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          restaurants={restaurants}
          selectedRestaurantId={selectedRestaurantId}
          setSelectedRestaurantId={setSelectedRestaurantId}
          pendingOrdersCount={stats?.pendingOrders || 0}
          foodItemsCount={stats?.totalDishes || 0}
          onOpenAddRestaurantModal={() => setIsAddRestModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* MAIN OWNER PANEL CONTENT */}
        <main className="flex-grow-1 p-3 p-md-4 overflow-auto">
          {activeTab === "overview" && (
            <OwnerOverview
              stats={stats}
              loading={loadingStats}
              error={statsError}
              onRefresh={fetchDashboardStats}
              onNavigateTab={handleTabChange}
              onSelectOrder={setSelectedOrder}
            />
          )}

          {activeTab === "restaurant" && (
            <RestaurantManagement
              restaurants={restaurants}
              selectedRestaurantId={selectedRestaurantId}
              onRestaurantUpdated={handleRestaurantUpdated}
              onOpenCreateModal={() => setIsAddRestModalOpen(true)}
            />
          )}

          {activeTab === "menu" && (
            <MenuManagement
              restaurants={restaurants}
              selectedRestaurantId={selectedRestaurantId}
            />
          )}

          {activeTab === "orders" && (
            <OrderManagement
              restaurants={restaurants}
              selectedRestaurantId={selectedRestaurantId}
              selectedOrder={selectedOrder}
            />
          )}
        </main>
      </div>

      {/* Add Restaurant Modal */}
      <AddRestaurantModal
        isOpen={isAddRestModalOpen}
        onClose={() => setIsAddRestModalOpen(false)}
        onRestaurantCreated={handleRestaurantCreated}
      />
    </div>
  );
};

export default OwnerDashboard;

