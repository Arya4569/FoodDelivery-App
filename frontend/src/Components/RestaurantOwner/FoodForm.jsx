import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faUpload,
  faSave,
  faUtensils,
  faIndianRupeeSign,
  faPepperHot,
  faBoxes,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import api from "../../utils/api";

const CATEGORIES = [
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

const SPICE_LEVELS = ["Mild", "Medium", "Spicy", "Extra Spicy"];

const FoodForm = ({
  isOpen,
  onClose,
  restaurantId,
  editItem = null,
  onItemSaved,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    category: "Main Course",
    spiceLevel: "Medium",
    isVeg: true,
    isAvailable: true,
    stock: 100,
    image: "",
  });

  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name || "",
        price: editItem.price !== undefined ? editItem.price : "",
        description: editItem.description || "",
        category: editItem.category || "Main Course",
        spiceLevel: editItem.spiceLevel || "Medium",
        isVeg: editItem.isVeg !== false,
        isAvailable: editItem.isAvailable !== false,
        stock: editItem.stock !== undefined ? editItem.stock : 100,
        image: "",
      });
      setImagePreview(
        editItem.image?.[0]?.url || editItem.images?.[0]?.url || ""
      );
    } else {
      setFormData({
        name: "",
        price: "",
        description: "",
        category: "Main Course",
        spiceLevel: "Medium",
        isVeg: true,
        isAvailable: true,
        stock: 100,
        image: "",
      });
      setImagePreview("");
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file (JPG, PNG, WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
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
      toast.error("Dish name is required");
      return;
    }

    const numPrice = Number(formData.price);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error("Please enter a valid price (>= 0)");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Dish description is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editItem && editItem._id) {
        // Edit food item
        const { data } = await api.put(
          `/v1/owner/food/${editItem._id}`,
          formData
        );
        toast.success(`Dish "${data.foodItem.name}" updated successfully! 🍕`);
        if (onItemSaved) onItemSaved(data.foodItem, "update");
      } else {
        // Add new food item
        const { data } = await api.post(
          `/v1/owner/restaurant/${restaurantId}/food`,
          formData
        );
        toast.success(`New dish "${data.foodItem.name}" added to menu! 🎉`);
        if (onItemSaved) onItemSaved(data.foodItem, "create");
      }
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save food item. Try again."
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
          maxWidth: "650px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-4">🍽️</span>
            <div>
              <h5 className="fw-bold mb-0 text-dark">
                {editItem ? "Edit Food Item" : "Add New Dish to Menu"}
              </h5>
              <small className="text-muted">
                {editItem
                  ? "Update ingredients, pricing, image or availability"
                  : "Fill in dish specifications to list on customer app"}
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
            {/* Dish Name */}
            <div className="col-md-7">
              <label className="form-label fw-semibold small text-dark">
                Dish / Food Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control rounded-3"
                placeholder="e.g. Paneer Butter Masala"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Price */}
            <div className="col-md-5">
              <label className="form-label fw-semibold small text-dark">
                Price (₹) <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-control rounded-end-3"
                  placeholder="e.g. 299"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Category */}
            <div className="col-md-6">
              <label className="form-label fw-semibold small text-dark">Category</label>
              <select
                className="form-select rounded-3"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Spice Level */}
            <div className="col-md-6">
              <label className="form-label fw-semibold small text-dark">Spice Level</label>
              <select
                className="form-select rounded-3"
                value={formData.spiceLevel}
                onChange={(e) => setFormData({ ...formData, spiceLevel: e.target.value })}
              >
                {SPICE_LEVELS.map((sp) => (
                  <option key={sp} value={sp}>
                    🌶️ {sp}
                  </option>
                ))}
              </select>
            </div>

            {/* Veg / Non-Veg Radio */}
            <div className="col-md-6">
              <label className="form-label fw-semibold small text-dark d-block">
                Dietary Preference
              </label>
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn rounded-start-3 ${
                    formData.isVeg ? "btn-success fw-bold" : "btn-outline-secondary"
                  }`}
                  onClick={() => setFormData({ ...formData, isVeg: true })}
                >
                  🌱 Vegetarian
                </button>
                <button
                  type="button"
                  className={`btn rounded-end-3 ${
                    !formData.isVeg ? "btn-danger fw-bold" : "btn-outline-secondary"
                  }`}
                  onClick={() => setFormData({ ...formData, isVeg: false })}
                >
                  🍗 Non-Veg
                </button>
              </div>
            </div>

            {/* Stock Quantity */}
            <div className="col-md-6">
              <label className="form-label fw-semibold small text-dark">
                Available Stock Units
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <FontAwesomeIcon icon={faBoxes} className="text-secondary" />
                </span>
                <input
                  type="number"
                  min="0"
                  className="form-control rounded-end-3"
                  placeholder="e.g. 50"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                />
              </div>
            </div>

            {/* Description */}
            <div className="col-12">
              <label className="form-label fw-semibold small text-dark">
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                rows="3"
                className="form-control rounded-3"
                placeholder="Describe key ingredients, preparation style, taste notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Image Upload & Preview */}
            <div className="col-12">
              <label className="form-label fw-semibold small text-dark d-block">
                Dish Image
              </label>
              <div className="d-flex align-items-center gap-3">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="dish-image-thumb shadow-sm"
                  />
                )}
                <div className="flex-grow-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control rounded-3"
                    onChange={handleImageChange}
                  />
                  <small className="text-muted d-block mt-1" style={{ fontSize: "11px" }}>
                    Upload image in JPG, PNG or WEBP up to 5MB. Uploads directly to Cloudinary.
                  </small>
                </div>
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="col-12">
              <div className="form-check form-switch pt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="availabilitySwitch"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                />
                <label className="form-check-label fw-semibold text-dark" htmlFor="availabilitySwitch">
                  Available for Immediate Ordering
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
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
              {submitting
                ? "Saving to Database..."
                : editItem
                ? "Update Dish"
                : "Add to Menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FoodForm;

