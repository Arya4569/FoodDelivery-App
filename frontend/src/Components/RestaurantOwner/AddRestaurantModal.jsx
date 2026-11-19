import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faStore, faSave } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import api from "../../utils/api";

const AddRestaurantModal = ({ isOpen, onClose, onRestaurantCreated }) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    phoneNumber: "",
    isVeg: false,
    openingTime: "09:00",
    closingTime: "23:00",
    deliveryTime: 30,
    deliveryRadius: 10,
    image: "",
  });

  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file (PNG, JPG, WEBP)");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Restaurant name is required");
      return;
    }

    if (!formData.address.trim()) {
      toast.error("Restaurant address is required");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/v1/owner/restaurant/new", formData);
      toast.success(`Restaurant "${data.restaurant.name}" created successfully! 🎉`);
      if (onRestaurantCreated) onRestaurantCreated(data.restaurant);
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to create restaurant. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
      onClick={onClose}
    >
      <div
        className="modal-card-custom bg-white rounded-4 shadow-lg p-4"
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-4">🏪</span>
            <div>
              <h5 className="fw-bold mb-0 text-dark">Register Restaurant Outlet</h5>
              <small className="text-muted">
                Create and link a new restaurant to your owner profile
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-circle"
            onClick={onClose}
            style={{ width: "32px", height: "32px", padding: 0 }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold small text-dark">
                Restaurant Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control rounded-3"
                placeholder="e.g. Royal Biryani Palace"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

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

            <div className="col-12">
              <label className="form-label fw-semibold small text-dark">
                Address & City <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control rounded-3"
                placeholder="e.g. MG Road, Near Station, Pune"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label fw-semibold small text-dark">
                Description / Cuisines
              </label>
              <textarea
                rows="2"
                className="form-control rounded-3"
                placeholder="e.g. Authentic Hyderabadi & Mughlai Cuisine"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold small text-dark">
                Opening Hours
              </label>
              <div className="input-group">
                <input
                  type="time"
                  className="form-control"
                  value={formData.openingTime}
                  onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                />
                <span className="input-group-text">to</span>
                <input
                  type="time"
                  className="form-control"
                  value={formData.closingTime}
                  onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                />
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold small text-dark">
                Delivery Settings
              </label>
              <div className="input-group">
                <input
                  type="number"
                  min="5"
                  className="form-control"
                  placeholder="Mins"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                />
                <span className="input-group-text">mins /</span>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  placeholder="Radius km"
                  value={formData.deliveryRadius}
                  onChange={(e) => setFormData({ ...formData, deliveryRadius: e.target.value })}
                />
                <span className="input-group-text">km</span>
              </div>
            </div>

            <div className="col-12">
              <label className="form-label fw-semibold small text-dark d-block">
                Cover Image
              </label>
              <div className="d-flex align-items-center gap-3">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="dish-image-thumb shadow-sm"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="form-control rounded-3"
                  onChange={handleImageChange}
                />
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill px-4"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-warning text-dark fw-bold rounded-pill px-4 shadow-sm"
              disabled={submitting}
            >
              <FontAwesomeIcon icon={faSave} className="me-2" />
              {submitting ? "Creating Restaurant..." : "Create Restaurant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRestaurantModal;

