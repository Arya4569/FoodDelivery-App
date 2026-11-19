import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSearch,
  faEdit,
  faTrash,
  faUtensils,
  faPepperHot,
  faCheckCircle,
  faTimesCircle,
  faFilter,
  faRefresh,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import api from "../../utils/api";
import FoodForm from "./FoodForm";

const CATEGORIES = [
  "All",
  "Main Course",
  "Appetizers & Starters",
  "Pizza",
  "Burgers & Sandwiches",
  "Biryani & Rice",
  "Chinese & Noodles",
  "South Indian",
  "Desserts & Sweets",
  "Beverages & Shakes",
  "Salads & Healthy",
];

const MenuManagement = ({
  restaurants = [],
  selectedRestaurantId,
}) => {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [vegFilter, setVegFilter] = useState("All"); // "All", "Veg", "NonVeg"
  const [availabilityFilter, setAvailabilityFilter] = useState("All"); // "All", "Available", "Unavailable"

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Find active restaurant
  const activeRestaurant = selectedRestaurantId
    ? restaurants.find((r) => r._id === selectedRestaurantId)
    : restaurants[0];

  const fetchFoodItems = async () => {
    if (!activeRestaurant) return;
    setLoading(true);
    setError(null);
    try {
      let queryParams = [];
      if (searchKeyword.trim()) queryParams.push(`keyword=${encodeURIComponent(searchKeyword.trim())}`);
      if (selectedCategory !== "All") queryParams.push(`category=${encodeURIComponent(selectedCategory)}`);
      if (vegFilter === "Veg") queryParams.push(`isVeg=true`);
      if (vegFilter === "NonVeg") queryParams.push(`isVeg=false`);
      if (availabilityFilter === "Available") queryParams.push(`isAvailable=true`);
      if (availabilityFilter === "Unavailable") queryParams.push(`isAvailable=false`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const { data } = await api.get(
        `/v1/owner/restaurant/${activeRestaurant._id}/foods${queryString}`
      );
      setFoodItems(data.foodItems || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch restaurant food items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRestaurant) {
      fetchFoodItems();
    }
  }, [activeRestaurant, selectedCategory, vegFilter, availabilityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFoodItems();
  };

  const handleToggleAvailability = async (item) => {
    const updatedStatus = !item.isAvailable;
    try {
      const { data } = await api.put(`/v1/owner/food/${item._id}`, {
        isAvailable: updatedStatus,
      });
      setFoodItems((prev) =>
        prev.map((f) => (f._id === item._id ? { ...f, isAvailable: updatedStatus } : f))
      );
      toast.success(
        `"${item.name}" is now marked as ${updatedStatus ? "Available" : "Unavailable"}`
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle availability");
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to remove "${item.name}" from your menu?`)) {
      return;
    }
    try {
      await api.delete(`/v1/owner/food/${item._id}`);
      setFoodItems((prev) => prev.filter((f) => f._id !== item._id));
      toast.success(`"${item.name}" removed from menu! 🗑️`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete food item");
    }
  };

  const handleItemSaved = (savedItem, action) => {
    if (action === "create") {
      setFoodItems((prev) => [savedItem, ...prev]);
    } else {
      setFoodItems((prev) =>
        prev.map((f) => (f._id === savedItem._id ? savedItem : f))
      );
    }
  };

  if (!activeRestaurant) {
    return (
      <div className="owner-table-card p-5 text-center">
        <FontAwesomeIcon icon={faUtensils} className="display-4 text-warning mb-3" />
        <h5 className="fw-bold">No Restaurant Selected</h5>
        <p className="text-muted">Please register or select a restaurant to manage menu items.</p>
      </div>
    );
  }

  return (
    <div className="menu-management">
      {/* Top Header & Actions */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            🍕 Menu & Food Items Management
          </h4>
          <p className="text-muted small mb-0">
            Outlet: <strong className="text-dark">{activeRestaurant.name}</strong> •{" "}
            {foodItems.length} items listed
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary rounded-pill btn-sm px-3"
            onClick={fetchFoodItems}
            title="Refresh menu items"
          >
            <FontAwesomeIcon icon={faRefresh} className="me-1" /> Refresh
          </button>
          <button
            className="btn btn-warning text-dark fw-bold rounded-pill px-4 shadow-sm"
            onClick={() => {
              setEditItem(null);
              setIsFormOpen(true);
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" /> Add Dish to Menu
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="owner-table-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          {/* Keyword Search */}
          <div className="col-12 col-md-4">
            <form onSubmit={handleSearchSubmit}>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <FontAwesomeIcon icon={faSearch} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 shadow-none"
                  placeholder="Search dish by name or keyword..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
            </form>
          </div>

          {/* Category Filter */}
          <div className="col-6 col-md-3">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Veg / Non-Veg Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={vegFilter}
              onChange={(e) => setVegFilter(e.target.value)}
            >
              <option value="All">All Diets</option>
              <option value="Veg">🌱 Pure Veg</option>
              <option value="NonVeg">🍗 Non-Veg</option>
            </select>
          </div>

          {/* Availability Filter */}
          <div className="col-12 col-md-3">
            <select
              className="form-select"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
            >
              <option value="All">All Availabilities</option>
              <option value="Available">🟢 Available Only</option>
              <option value="Unavailable">🔴 Out of Stock / Hidden</option>
            </select>
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="alert alert-danger rounded-4 p-3 mb-4 d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-danger" onClick={fetchFoodItems}>
            Retry
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div className="text-center py-5 owner-table-card">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading menu...</span>
          </div>
          <p className="text-muted mt-2 mb-0">Loading menu items from database...</p>
        </div>
      ) : foodItems.length === 0 ? (
        /* EMPTY STATE */
        <div className="owner-table-card p-5 text-center">
          <FontAwesomeIcon icon={faUtensils} className="display-4 text-secondary mb-3" />
          <h5 className="fw-bold text-dark">No Food Items Found</h5>
          <p className="text-muted mb-4" style={{ maxWidth: "450px", margin: "0 auto" }}>
            {searchKeyword || selectedCategory !== "All" || vegFilter !== "All"
              ? "No dishes match your active filter criteria. Try clearing search filters."
              : "Your menu is currently empty. Click the button below to add your first delicious dish!"}
          </p>
          <button
            className="btn btn-warning text-dark fw-bold rounded-pill px-4 shadow-sm"
            onClick={() => {
              setEditItem(null);
              setIsFormOpen(true);
            }}
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Add First Dish
          </button>
        </div>
      ) : (
        /* FOOD ITEMS TABLE */
        <div className="owner-table-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "70px" }}>Image</th>
                  <th>Dish Name</th>
                  <th>Category</th>
                  <th>Spice</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {foodItems.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <img
                        src={
                          item.image?.[0]?.url ||
                          item.images?.[0]?.url ||
                          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80"
                        }
                        alt={item.name}
                        className="dish-image-thumb"
                      />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className={`badge ${
                            item.isVeg ? "bg-success" : "bg-danger"
                          }`}
                          style={{ fontSize: "10px" }}
                        >
                          {item.isVeg ? "VEG" : "NON-VEG"}
                        </span>
                        <span className="fw-bold text-dark">{item.name}</span>
                      </div>
                      <small
                        className="text-muted text-truncate d-block"
                        style={{ maxWidth: "250px", fontSize: "11px" }}
                        title={item.description}
                      >
                        {item.description}
                      </small>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {item.category || "Main Course"}
                      </span>
                    </td>
                    <td>
                      <span className="small text-muted">
                        🌶️ {item.spiceLevel || "Medium"}
                      </span>
                    </td>
                    <td>
                      <span className="fw-bold text-success fs-6">
                        ₹{item.price}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          item.stock > 10
                            ? "bg-light text-dark border"
                            : item.stock > 0
                            ? "bg-warning-subtle text-warning-dark"
                            : "bg-danger-subtle text-danger"
                        }`}
                      >
                        {item.stock} in stock
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm rounded-pill px-2.5 py-1 ${
                          item.isAvailable
                            ? "btn-outline-success"
                            : "btn-outline-secondary"
                        }`}
                        style={{ fontSize: "11px" }}
                        onClick={() => handleToggleAvailability(item)}
                        title="Click to toggle availability"
                      >
                        {item.isAvailable ? "🟢 Available" : "🔴 Hidden"}
                      </button>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1">
                        <button
                          className="btn btn-sm btn-outline-primary rounded-pill px-3"
                          onClick={() => {
                            setEditItem(item);
                            setIsFormOpen(true);
                          }}
                          title="Edit Dish"
                        >
                          <FontAwesomeIcon icon={faEdit} className="me-1" /> Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger rounded-circle"
                          style={{ width: "32px", height: "32px", padding: 0 }}
                          onClick={() => handleDeleteItem(item)}
                          title="Delete Dish"
                        >
                          <FontAwesomeIcon icon={faTrash} />
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

      {/* Add / Edit Food Modal */}
      <FoodForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditItem(null);
        }}
        restaurantId={activeRestaurant?._id}
        editItem={editItem}
        onItemSaved={handleItemSaved}
      />
    </div>
  );
};

export default MenuManagement;

