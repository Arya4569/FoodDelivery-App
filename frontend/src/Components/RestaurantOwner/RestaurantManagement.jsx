import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStore,
  faPhone,
  faMapMarkerAlt,
  faClock,
  faMotorcycle,
  faSave,
  faUpload,
  faToggleOn,
  faToggleOff,
  faCheck,
  faExclamationCircle,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import api from "../../utils/api";

const RestaurantManagement = ({
  restaurants = [],
  selectedRestaurantId,
  onRestaurantUpdated,
  onOpenCreateModal,
}) => {
  const [activeRestaurant, setActiveRestaurant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    phoneNumber: "",
    address: "",
    openingTime: "09:00",
    closingTime: "23:00",
    deliveryTime: 30,
    deliveryRadius: 10,
    isOpen: true,
    isVeg: false,
    image: "",
  });

  // Select restaurant
  useEffect(() => {
    if (restaurants.length > 0) {
      const match = selectedRestaurantId
        ? restaurants.find((r) => r._id === selectedRestaurantId)
        : restaurants[0];
      if (match) {
        setActiveRestaurant(match);
        setFormData({
          name: match.name || "",
          description: match.description || "",
          phoneNumber: match.phoneNumber || "",
          address: match.address || "",
          openingTime: match.openingTime || "09:00",
          closingTime: match.closingTime || "23:00",
          deliveryTime: match.deliveryTime || 30,
          deliveryRadius: match.deliveryRadius || 10,
          isOpen: match.isOpen !== false,
          isVeg: match.isVeg === true,
          image: "",
        });
        setImagePreview(match.images?.[0]?.url || "");
      }
    }
  }, [restaurants, selectedRestaurantId]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.readyState === 2) {
        setImagePreview(reader.result);
        setFormData((prev) => ({ ...prev, image: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleOpen = async () => {
    if (!activeRestaurant) return;
    const newStatus = !formData.isOpen;
    setFormData((prev) => ({ ...prev, isOpen: newStatus }));

    try {
      const { data } = await api.put(`/v1/owner/restaurant/${activeRestaurant._id}`, {
        isOpen: newStatus,
      });
      toast.success(
        `Restaurant is now marked as ${newStatus ? "OPEN for orders 🟢" : "CLOSED 🔴"}`
      );
      if (onRestaurantUpdated) onRestaurantUpdated(data.restaurant);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle restaurant status");
      // Revert on failure
      setFormData((prev) => ({ ...prev, isOpen: !newStatus }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeRestaurant) return;

    if (!formData.name.trim()) {
      toast.error("Restaurant name is required");
      return;
    }

    if (!formData.address.trim()) {
      toast.error("Restaurant address is required");
      return;
    }

    if (Number(formData.deliveryTime) <= 0) {
      toast.error("Delivery time must be greater than 0");
      return;
    }

    if (Number(formData.deliveryRadius) <= 0) {
      toast.error("Delivery radius must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put(
        `/v1/owner/restaurant/${activeRestaurant._id}`,
        formData
      );
      toast.success("Restaurant information updated successfully! 🎉");
      if (onRestaurantUpdated) onRestaurantUpdated(data.restaurant);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update restaurant details"
      );
    } finally {
      setSaving(false);
    }
  };

  if (restaurants.length === 0) {
    return (
      <div className="owner-table-card p-5 text-center">
        <FontAwesomeIcon icon={faStore} className="display-4 text-warning mb-3" />
        <h4 className="fw-bold text-dark">No Restaurant Assigned Yet</h4>
        <p className="text-muted mb-4" style={{ maxWidth: "500px", margin: "0 auto" }}>
          You don't have an active restaurant assigned to your account yet. You can create your restaurant outlet right now to start adding food items and accepting orders.
        </p>
        <button
          className="btn btn-warning rounded-pill px-4 fw-bold shadow-sm"
          onClick={onOpenCreateModal}
        >
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          Create / Register Restaurant
        </button>
      </div>
    );
  }

  return (
    <div className="restaurant-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold text-dark mb-1">🏪 Restaurant Profile & Operations</h4>
          <p className="text-muted small mb-0">
            Configure restaurant identity, operating hours, delivery parameters, and store status.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {/* Status Quick Toggle Button */}
          <button
            type="button"
            className={`btn rounded-pill px-3 fw-bold d-flex align-items-center gap-2 shadow-sm ${
              formData.isOpen ? "btn-success" : "btn-danger"
            }`}
            onClick={handleToggleOpen}
          >
            <FontAwesomeIcon icon={formData.isOpen ? faToggleOn : faToggleOff} size="lg" />
            <span>Store Status: {formData.isOpen ? "OPEN" : "CLOSED"}</span>
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* LEFT COLUMN: Visual Preview Card */}
        <div className="col-lg-4">
          <div className="owner-table-card p-3 mb-4">
            <h6 className="fw-bold text-dark mb-3">Live Customer Preview</h6>
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
              <img
                src={
                  imagePreview ||
                  activeRestaurant?.images?.[0]?.url ||
                  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
                }
                alt="Restaurant Cover"
                className="rest-cover-image"
              />
              <div className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="fw-bold text-dark mb-0">{formData.name || "Restaurant Name"}</h5>
                  <span
                    className={`badge rounded-pill ${
                      formData.isOpen ? "bg-success" : "bg-danger"
                    }`}
                  >
                    {formData.isOpen ? "Accepting Orders" : "Currently Closed"}
                  </span>
                </div>
                <p className="text-muted small mb-2 text-truncate">
                  {formData.description || "Fresh & delicious food prepared daily."}
                </p>
                <div className="d-flex align-items-center gap-2 small text-secondary mb-2">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-danger" />
                  <span className="text-truncate">{formData.address || "Street Address"}</span>
                </div>
                <div className="d-flex align-items-center gap-2 small text-secondary mb-3">
                  <FontAwesomeIcon icon={faClock} className="text-warning" />
                  <span>
                    {formData.openingTime} - {formData.closingTime}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <span className="badge bg-light text-dark border">
                    🚀 {formData.deliveryTime} mins est.
                  </span>
                  <span className="badge bg-light text-dark border">
                    📍 {formData.deliveryRadius} km radius
                  </span>
                  <span className={`badge ${formData.isVeg ? "bg-success" : "bg-danger"}`}>
                    {formData.isVeg ? "Pure Veg" : "Veg & Non-Veg"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Restaurant Selector if multiple */}
          {restaurants.length > 1 && (
            <div className="owner-table-card p-3">
              <h6 className="fw-bold text-dark mb-2">Select Outlet to Edit</h6>
              <div className="d-flex flex-column gap-2">
                {restaurants.map((r) => (
                  <button
                    key={r._id}
                    className={`btn text-start rounded-3 p-2 border ${
                      activeRestaurant?._id === r._id
                        ? "btn-warning text-dark fw-bold"
                        : "btn-light text-dark"
                    }`}
                    onClick={() => {
                      setActiveRestaurant(r);
                      setFormData({
                        name: r.name || "",
                        description: r.description || "",
                        phoneNumber: r.phoneNumber || "",
                        address: r.address || "",
                        openingTime: r.openingTime || "09:00",
                        closingTime: r.closingTime || "23:00",
                        deliveryTime: r.deliveryTime || 30,
                        deliveryRadius: r.deliveryRadius || 10,
                        isOpen: r.isOpen !== false,
                        isVeg: r.isVeg === true,
                        image: "",
                      });
                      setImagePreview(r.images?.[0]?.url || "");
                    }}
                  >
                    <div className="fw-semibold">{r.name}</div>
                    <small className="text-muted d-block">{r.address}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Edit Form */}
        <div className="col-lg-8">
          <div className="owner-table-card p-4">
            <h5 className="fw-bold text-dark mb-4 pb-2 border-bottom">
              Edit Restaurant Information
            </h5>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Restaurant Name */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold small text-dark">
                    Restaurant Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    placeholder="e.g. Spice Symphony"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Contact Phone */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold small text-dark">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    className="form-control rounded-3"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>

                {/* Address */}
                <div className="col-12">
                  <label className="form-label fw-semibold small text-dark">
                    Address & Location <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    placeholder="Complete outlet street address, locality and city"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                {/* Description */}
                <div className="col-12">
                  <label className="form-label fw-semibold small text-dark">
                    Description & Cuisines
                  </label>
                  <textarea
                    rows="3"
                    className="form-control rounded-3"
                    placeholder="Provide a welcoming description of your kitchen, cuisines and specialities..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Opening and Closing Hours */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold small text-dark">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    className="form-control rounded-3"
                    value={formData.openingTime}
                    onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small text-dark">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    className="form-control rounded-3"
                    value={formData.closingTime}
                    onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                  />
                </div>

                {/* Delivery Time & Delivery Radius */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold small text-dark">
                    Estimated Delivery Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    className="form-control rounded-3"
                    value={formData.deliveryTime}
                    onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small text-dark">
                    Delivery Radius (km)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="form-control rounded-3"
                    value={formData.deliveryRadius}
                    onChange={(e) => setFormData({ ...formData, deliveryRadius: e.target.value })}
                  />
                </div>

                {/* Veg Only vs Veg & Non-Veg */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold small text-dark d-block">
                    Cuisine Type
                  </label>
                  <div className="btn-group w-100" role="group">
                    <button
                      type="button"
                      className={`btn rounded-start-3 ${
                        formData.isVeg ? "btn-success" : "btn-outline-secondary"
                      }`}
                      onClick={() => setFormData({ ...formData, isVeg: true })}
                    >
                      🌱 Pure Veg
                    </button>
                    <button
                      type="button"
                      className={`btn rounded-end-3 ${
                        !formData.isVeg ? "btn-danger" : "btn-outline-secondary"
                      }`}
                      onClick={() => setFormData({ ...formData, isVeg: false })}
                    >
                      🍗 Veg & Non-Veg
                    </button>
                  </div>
                </div>

                {/* Restaurant Cover Image */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold small text-dark d-block">
                    Update Restaurant Banner Image
                  </label>
                  <div className="input-group">
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control rounded-3"
                      onChange={handleImageChange}
                    />
                  </div>
                  <small className="text-muted" style={{ fontSize: "11px" }}>
                    Supports PNG, JPG, WEBP up to 5MB. Uploads securely to Cloudinary.
                  </small>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <button
                  type="submit"
                  className="btn btn-warning text-dark fw-bold rounded-pill px-4 shadow-sm"
                  disabled={saving}
                >
                  <FontAwesomeIcon icon={faSave} className="me-2" />
                  {saving ? "Saving Changes..." : "Save Restaurant Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantManagement;

