import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faIndianRupeeSign,
  faTrash,
  faPlus,
  faMinus,
  faShieldHalved,
  faTicket,
  faCheck,
  faBagShopping,
  faArrowLeft,
  faArrowRight,
  faClock,
  faLocationDot,
  faUtensils,
  faCircleCheck,
  faCreditCard,
  faMoneyBillWave,
  faHome,
  faBuilding,
  faPlusCircle
} from "@fortawesome/free-solid-svg-icons";
import {
  fetchCart,
  updateCartItem,
  removeCartItem,
  clearEntireCart
} from "../redux/actions/cartActions";
import { getFoodItemImage } from "../utils/foodImages";
import api from "../utils/api";
import { toast } from "react-toastify";

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isAuthenticated } = useSelector((state) => state.user || {});
  const { cartItems = [], restaurant = {}, loading } = useSelector(
    (state) => state.carts || {}
  );

  const [promoCode, setPromoCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [paymentMode, setPaymentMode] = useState("online"); // "online" or "cod"
  const [isProcessing, setIsProcessing] = useState(false);

  // Delivery Address Management State
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    addressLine: "",
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411045",
    phoneNumber: user?.phoneNumber || "",
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  // Load user saved addresses
  useEffect(() => {
    if (isAuthenticated) {
      api
        .get("/v1/users/addresses")
        .then((res) => {
          const list = res.data.addresses || [];
          setSavedAddresses(list);
          const def = list.find((a) => a.isDefault) || list[0];
          if (def) setSelectedAddressId(def._id);
        })
        .catch((err) => console.warn("Could not load addresses:", err.message));
    }
  }, [isAuthenticated]);

  // Read saved delivery location from Header / localStorage
  const deliveryLocation = useMemo(() => {
    try {
      const saved = localStorage.getItem("fooddelivery_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.area || parsed.city || "Pune";
      }
    } catch (e) {
      // fallback
    }
    return user?.address || "Baner, Pune";
  }, [user]);

  // Selected address object resolver
  const activeAddress = useMemo(() => {
    if (selectedAddressId) {
      return savedAddresses.find((a) => a._id === selectedAddressId);
    }
    return savedAddresses[0] || null;
  }, [selectedAddressId, savedAddresses]);

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.addressLine.trim() || !addressForm.city.trim() || !addressForm.postalCode.trim()) {
      toast.error("Please fill address line, city, and postal code");
      return;
    }
    setSavingAddress(true);
    try {
      const res = await api.post("/v1/users/addresses", addressForm);
      const list = res.data.addresses || [];
      setSavedAddresses(list);
      const newlyAdded = list[list.length - 1];
      if (newlyAdded) setSelectedAddressId(newlyAdded._id);
      setShowAddressForm(false);
      setAddressForm({
        label: "Home",
        addressLine: "",
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411045",
        phoneNumber: user?.phoneNumber || "",
        isDefault: false,
      });
      toast.success("Delivery address saved successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  // Sanitize items: filter out any dead/price-0/placeholder items
  const validItems = useMemo(() => {
    if (!Array.isArray(cartItems)) return [];
    return cartItems.filter((item) => {
      if (!item) return false;
      const food = item.foodItem || item;
      const price = Number(food.price || item.price || 0);
      const name = food.name || item.name;
      return name && name !== "Delicious Dish" && price > 0;
    });
  }, [cartItems]);

  const increaseQty = (foodItemId, quantity, stock = 100) => {
    if (quantity >= stock) {
      toast.warning("Maximum stock limit reached");
      return;
    }
    dispatch(updateCartItem(foodItemId, quantity + 1));
  };

  const decreaseQty = (foodItemId, quantity, foodName = "Item") => {
    if (quantity <= 1) {
      dispatch(removeCartItem(foodItemId));
      toast.info(`Removed ${foodName} from cart`);
      return;
    }
    dispatch(updateCartItem(foodItemId, quantity - 1));
  };

  const removeItemHandler = (foodItemId, foodName = "Item") => {
    dispatch(removeCartItem(foodItemId));
    toast.info(`Removed ${foodName} from cart`);
  };

  const clearCartHandler = () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      dispatch(clearEntireCart());
      toast.info("Cart cleared");
    }
  };

  // Bill Calculations (Swiggy / Zomato style)
  const itemTotal = useMemo(() => {
    return validItems.reduce((acc, item) => {
      const food = item.foodItem || item;
      const price = Number(food.price || item.price || 0);
      const qty = item.quantity || 1;
      return acc + qty * price;
    }, 0);
  }, [validItems]);

  const isFreeDelivery = itemTotal > 199;
  const deliveryFee = isFreeDelivery ? 0 : 35;
  const platformFee = itemTotal > 0 ? 5 : 0;
  const gstCharges = Math.round(itemTotal * 0.05);

  const totalSavings = useMemo(() => {
    let savings = discountAmount;
    if (isFreeDelivery && itemTotal > 0) {
      savings += 35;
    }
    return savings;
  }, [discountAmount, isFreeDelivery, itemTotal]);

  const finalTotal = Math.max(
    0,
    itemTotal + deliveryFee + platformFee + gstCharges - discountAmount
  );

  // Apply Coupon Handler
  const applyPromoHandler = (codeToApply) => {
    const code = (codeToApply || promoCode).trim().toUpperCase();
    if (!code) return;

    if (code === "WELCOME50") {
      const disc = Math.min(100, Math.round(itemTotal * 0.5));
      setDiscountAmount(disc);
      setAppliedPromo("WELCOME50");
      setPromoCode("WELCOME50");
      toast.success(`🎉 WELCOME50 applied! You saved ₹${disc}`);
    } else if (code === "FLAT30") {
      if (itemTotal < 199) {
        toast.error("FLAT30 requires a minimum order of ₹199");
        return;
      }
      setDiscountAmount(30);
      setAppliedPromo("FLAT30");
      setPromoCode("FLAT30");
      toast.success(`🎉 FLAT30 applied! You saved ₹30`);
    } else {
      toast.error("Invalid coupon code. Try WELCOME50 or FLAT30");
    }
  };

  const removePromoHandler = () => {
    setDiscountAmount(0);
    setAppliedPromo("");
    setPromoCode("");
    toast.info("Coupon removed");
  };

  // Quick note tag click
  const appendNoteTag = (tag) => {
    if (!deliveryNote.includes(tag)) {
      setDeliveryNote((prev) => (prev ? `${prev}, ${tag}` : tag));
    }
  };

  // Checkout Handler: Supports both Real Stripe Online Payment & Cash on Delivery
  const checkoutHandler = async () => {
    if (!isAuthenticated) {
      toast.info("Please sign in to proceed with payment");
      navigate("/login");
      return;
    }

    if (validItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsProcessing(true);

    const deliveryInfo = activeAddress
      ? {
          address: activeAddress.addressLine,
          city: activeAddress.city,
          postalCode: activeAddress.postalCode,
          phoneNo: activeAddress.phoneNumber || user?.phoneNumber || "9876543210",
          country: activeAddress.country || "IN",
        }
      : {
          address: deliveryLocation,
          city: "Pune",
          postalCode: "411005",
          phoneNo: user?.phoneNumber || "9876543210",
          country: "IN",
        };

    // 1. CASH ON DELIVERY (COD)
    if (paymentMode === "cod") {
      try {
        const { data } = await api.post("/v1/eats/orders/cod", {
          deliveryNote,
          finalTotal,
          deliveryInfo,
        });

        if (data.success && data.order) {
          toast.success("🎉 Order Placed! Pay in Cash / UPI upon delivery.");
          dispatch(clearEntireCart());
          navigate(`/order/${data.order._id}`);
        } else {
          toast.error("Unable to place COD order. Please try again.");
        }
      } catch (err) {
        console.error("COD Order Error:", err);
        toast.error(err.response?.data?.message || "Failed to place COD order");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // 2. ONLINE PAYMENT (STRIPE)
    try {
      sessionStorage.setItem("pending_delivery_info", JSON.stringify(deliveryInfo));
      const { data } = await api.post("/v1/payment/process", {
        email: user?.email,
        items: validItems,
        deliveryNote,
        finalTotal,
        restaurantId: restaurant?._id,
        deliveryInfo,
      });

      if (data.success && data.url) {
        toast.info("Redirecting to Secure Stripe Payment Gateway...");
        // Redirect to actual Stripe payment page
        window.location.href = data.url;
      } else {
        toast.error(data.message || "Failed to initiate online payment.");
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
      toast.error(error.response?.data?.message || "Payment gateway connection error. Please try again or choose Cash on Delivery.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5 my-5">
        <div className="spinner-border text-success" role="status"></div>
        <p className="mt-3 text-muted fw-semibold">Loading your delicious cart...</p>
      </div>
    );
  }

  // 1. EMPTY CART STATE
  if (validItems.length === 0) {
    return (
      <div className="container my-5 py-5 text-center">
        <div
          className="card border-0 shadow-sm rounded-4 p-5 mx-auto bg-white"
          style={{ maxWidth: "520px", height: "auto" }}
        >
          <div
            className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
            style={{ width: "90px", height: "90px", background: "#f0fdf4" }}
          >
            <FontAwesomeIcon icon={faBagShopping} size="2x" className="text-success" />
          </div>
          <h3 className="fw-bold text-dark mb-2">Your cart is empty</h3>
          <p className="text-muted mb-4" style={{ fontSize: "0.95rem" }}>
            Good food is always cooking! Go ahead, order some mouth-watering dishes from top restaurants.
          </p>
          <Link
            to="/"
            className="btn btn-success px-4 py-2 rounded-pill fw-bold shadow-sm"
            style={{ fontSize: "0.95rem" }}
          >
            SEE RESTAURANTS NEAR YOU <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  // 2. ACTIVE CART STATE (Compact & Sleek Swiggy / Zomato Split)
  return (
    <div className="cart-page-wrapper container my-3 pb-5">
      {/* Top Header Bar */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center">
          <Link
            to="/"
            className="btn btn-outline-secondary btn-sm rounded-pill mr-3 px-3 fw-semibold"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-1" /> Continue Shopping
          </Link>
          <h4 className="fw-bold mb-0 text-dark">
            Order Summary{" "}
            <span
              className="badge rounded-pill bg-light text-success border ml-2"
              style={{ fontSize: "0.85rem", verticalAlign: "middle" }}
            >
              {validItems.length} {validItems.length === 1 ? "Item" : "Items"}
            </span>
          </h4>
        </div>

        <button
          className="btn btn-outline-danger btn-sm rounded-pill px-3"
          onClick={clearCartHandler}
          title="Clear all items from cart"
        >
          <FontAwesomeIcon icon={faTrash} className="mr-1" /> Clear Cart
        </button>
      </div>

      <div className="row">
        {/* ================= LEFT COLUMN: Items, Notes, Address ================= */}
        <div className="col-12 col-lg-7 mb-4">
          {/* Restaurant Banner Card (Height Auto - No Empty Space) */}
          <div
            className="card shadow-sm border-0 rounded-4 p-3 mb-3 bg-white"
            style={{ height: "auto" }}
          >
            <div className="d-flex align-items-center">
              <div
                className="rounded-3 p-3 mr-3 d-flex align-items-center justify-content-center text-white flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #056a3a 0%, #16a34a 100%)",
                  width: "50px",
                  height: "50px",
                  fontSize: "1.3rem"
                }}
              >
                🍽️
              </div>
              <div className="flex-grow-1">
                <h6 className="fw-bold mb-0 text-dark fs-5">
                  {restaurant?.name || "Selected Restaurant"}
                </h6>
                <div className="d-flex align-items-center gap-2 text-muted small mt-1">
                  <span>
                    <FontAwesomeIcon icon={faClock} className="mr-1 text-primary" /> Delivery in 25-30 mins
                  </span>
                  <span className="mx-1">•</span>
                  <span>
                    <FontAwesomeIcon icon={faLocationDot} className="mr-1 text-danger" /> {restaurant?.address || "Baner, Pune"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Items List Card */}
          <div
            className="card shadow-sm border-0 rounded-4 p-3 p-md-4 bg-white mb-3"
            style={{ height: "auto" }}
          >
            <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
              <h6 className="fw-bold mb-0 text-dark fs-6">
                Items Added ({validItems.length})
              </h6>
              <span className="text-muted small fw-semibold">Freshly prepared</span>
            </div>

            {validItems.map((item, index) => {
              const food = item.foodItem || item || {};
              const foodId = food._id || item._id || index;
              const price = Number(food.price || item.price || 0);
              const qty = item.quantity || 1;

              // Extract image URL safely
              const rawImg =
                (Array.isArray(food.image) ? food.image[0]?.url || food.image[0] : food.image?.url || food.image) ||
                (Array.isArray(food.images) ? food.images[0]?.url || food.images[0] : food.images?.url || food.images);
              const dishImage = getFoodItemImage(food.name, rawImg);

              const isVeg =
                food.isVeg !== undefined
                  ? food.isVeg
                  : !food.name?.toLowerCase().includes("chicken") &&
                    !food.name?.toLowerCase().includes("mutton") &&
                    !food.name?.toLowerCase().includes("fish");

              return (
                <div
                  className="cart-item-row d-flex align-items-center justify-content-between py-3 border-bottom"
                  key={foodId}
                >
                  {/* Left: Dish Thumbnail + Veg Icon & Dish Name */}
                  <div className="d-flex align-items-center" style={{ maxWidth: "60%" }}>
                    <img
                      src={dishImage}
                      alt={food.name}
                      className="rounded-3 mr-3 flex-shrink-0 shadow-sm border"
                      style={{ width: "65px", height: "65px", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500";
                      }}
                    />

                    <div>
                      <div className="d-flex align-items-center mb-1">
                        <span
                          className={`veg-indicator ${isVeg ? "veg" : "non-veg"} mr-2 flex-shrink-0`}
                          title={isVeg ? "Pure Veg" : "Non-Veg"}
                        >
                          <span className="dot"></span>
                        </span>
                        <h6 className="fw-bold mb-0 text-dark text-truncate" style={{ maxWidth: "220px", fontSize: "0.95rem" }}>
                          {food.name}
                        </h6>
                      </div>
                      <div className="text-muted small fw-semibold">
                        <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" /> {price} each
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity Stepper, Price & Remove */}
                  <div className="d-flex align-items-center">
                    <div className="fooditem-stepper shadow-sm d-inline-flex align-items-center mr-3">
                      <button
                        className="stepper-btn minus"
                        onClick={() => decreaseQty(foodId, qty, food.name)}
                        title="Decrease quantity"
                      >
                        <FontAwesomeIcon icon={faMinus} size="xs" />
                      </button>
                      <span className="stepper-qty px-2 fw-bold">{qty}</span>
                      <button
                        className="stepper-btn plus"
                        onClick={() => increaseQty(foodId, qty, food.stock)}
                        title="Increase quantity"
                      >
                        <FontAwesomeIcon icon={faPlus} size="xs" />
                      </button>
                    </div>

                    <div className="fw-bold text-dark text-right mr-3" style={{ minWidth: "60px", fontSize: "1rem" }}>
                      <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" /> {qty * price}
                    </div>

                    <button
                      className="btn btn-sm btn-light text-danger border-0 p-1 rounded-circle"
                      onClick={() => removeItemHandler(foodId, food.name)}
                      title="Remove item"
                      style={{ width: "30px", height: "30px" }}
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Quick Cooking / Delivery Instructions */}
            <div className="mt-3 pt-2">
              <label className="form-label small fw-bold text-dark mb-2">
                <FontAwesomeIcon icon={faUtensils} className="mr-1 text-success" />
                Cooking / Delivery Instructions (Optional)
              </label>

              {/* Tag suggestions */}
              <div className="d-flex flex-wrap gap-2 mb-2">
                {[
                  "No Cutlery Needed 🍴",
                  "Make it less spicy 🌶️",
                  "Leave at door 🚪",
                  "Avoid onions 🧅",
                  "Don't ring bell 🔔"
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="btn btn-sm btn-light border rounded-pill px-2 py-1 text-muted mr-1 mb-1"
                    style={{ fontSize: "0.78rem" }}
                    onClick={() => appendNoteTag(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <textarea
                className="form-control rounded-3"
                rows="2"
                placeholder="e.g. Please avoid onions, make it less spicy, leave at door..."
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                style={{ fontSize: "0.88rem" }}
              />
            </div>
          </div>

          {/* Delivery Address Card with Selection & Add Form */}
          <div
            className="card shadow-sm border-0 rounded-4 p-3 bg-white"
            style={{ height: "auto" }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle p-2 mr-3 d-flex align-items-center justify-content-center text-success"
                  style={{ background: "#f0fdf4", width: "40px", height: "40px" }}
                >
                  <FontAwesomeIcon icon={faLocationDot} size="lg" />
                </div>
                <div>
                  <h6 className="fw-bold mb-0 text-dark">Deliver To</h6>
                  <small className="text-muted d-block text-truncate" style={{ maxWidth: "280px" }}>
                    {activeAddress
                      ? `${activeAddress.label}: ${activeAddress.addressLine}, ${activeAddress.city}`
                      : deliveryLocation}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline-success btn-sm rounded-pill px-3 fw-bold"
                onClick={() => setShowAddressForm(!showAddressForm)}
              >
                <FontAwesomeIcon icon={faPlusCircle} className="mr-1" />
                {showAddressForm ? "Close" : "+ Add New"}
              </button>
            </div>

            {/* Saved Addresses List */}
            {savedAddresses.length > 0 && !showAddressForm && (
              <div className="mt-2 pt-2 border-top">
                <small className="text-muted fw-bold d-block mb-2">SELECT SAVED ADDRESS:</small>
                <div className="d-flex flex-wrap gap-2">
                  {savedAddresses.map((addr) => {
                    const isSelected = (activeAddress?._id === addr._id);
                    return (
                      <div
                        key={addr._id}
                        className={`p-2 rounded-3 border d-flex align-items-center cursor-pointer mr-2 mb-2 ${
                          isSelected ? "border-success bg-light" : "border-muted"
                        }`}
                        style={{ cursor: "pointer", transition: "0.2s" }}
                        onClick={() => setSelectedAddressId(addr._id)}
                      >
                        <FontAwesomeIcon
                          icon={addr.label === "Work" ? faBuilding : faHome}
                          className={`mr-2 ${isSelected ? "text-success" : "text-muted"}`}
                        />
                        <div>
                          <strong className="d-block small text-dark">
                            {addr.label} {addr.isDefault && <span className="badge bg-secondary ms-1">Default</span>}
                          </strong>
                          <span className="text-muted small text-truncate d-block" style={{ maxWidth: "180px" }}>
                            {addr.addressLine}, {addr.city}
                          </span>
                        </div>
                        {isSelected && (
                          <FontAwesomeIcon icon={faCircleCheck} className="text-success ml-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add New Address Inline Form */}
            {showAddressForm && (
              <form onSubmit={handleSaveAddress} className="mt-3 pt-3 border-top">
                <h6 className="fw-bold text-dark small mb-3">Add New Delivery Address</h6>
                <div className="row g-2 mb-2">
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-bold">Label</label>
                    <select
                      className="form-select form-select-sm rounded-3"
                      value={addressForm.label}
                      onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-8">
                    <label className="form-label small fw-bold">Address Line / Flat / Street</label>
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-3"
                      placeholder="e.g. Flat 402, Sunshine Apts, Baner Road"
                      value={addressForm.addressLine}
                      onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6 col-md-4">
                    <label className="form-label small fw-bold">City</label>
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-3"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-6 col-md-4">
                    <label className="form-label small fw-bold">Pincode</label>
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-3"
                      placeholder="e.g. 411045"
                      value={addressForm.postalCode}
                      onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-bold">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control form-control-sm rounded-3"
                      placeholder="e.g. 9876543210"
                      value={addressForm.phoneNumber}
                      onChange={(e) => setAddressForm({ ...addressForm, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-pill"
                    onClick={() => setShowAddressForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm rounded-pill fw-bold px-3"
                    disabled={savingAddress}
                  >
                    {savingAddress ? "Saving..." : "Save & Deliver Here"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Coupons, Bill & Payment Mode ================= */}
        <div className="col-12 col-lg-5">
          {/* 1. Offers & Coupons Card */}
          <div
            className="card shadow-sm border-0 rounded-4 p-3 p-md-4 bg-white mb-3"
            style={{ height: "auto" }}
          >
            <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
              <FontAwesomeIcon icon={faTicket} className="mr-2 text-warning" />
              Offers & Coupons
            </h6>

            {appliedPromo ? (
              <div
                className="p-3 rounded-3 border d-flex align-items-center justify-content-between"
                style={{ background: "#f0fdf4", borderColor: "#86efac" }}
              >
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-success fs-5 mr-2" />
                  <div>
                    <span className="fw-bold text-success mr-1">'{appliedPromo}' applied</span>
                    <div className="text-muted small">You saved ₹{discountAmount} on this order</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger fw-bold text-decoration-none p-0"
                  onClick={removePromoHandler}
                >
                  REMOVE
                </button>
              </div>
            ) : (
              <div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyPromoHandler();
                  }}
                  className="d-flex gap-2 mb-3"
                >
                  <input
                    type="text"
                    className="form-control rounded-3 text-uppercase mr-2"
                    placeholder="ENTER COUPON CODE"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    style={{ fontSize: "0.88rem", letterSpacing: "1px" }}
                  />
                  <button
                    type="submit"
                    className="btn btn-outline-success fw-bold px-3 rounded-3"
                    disabled={!promoCode.trim()}
                  >
                    Apply
                  </button>
                </form>

                {/* Available Quick Coupon Cards */}
                <div
                  className="p-2 rounded-3 border d-flex align-items-center justify-content-between mb-2"
                  style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                >
                  <div>
                    <span
                      className="badge text-dark mr-2 border"
                      style={{ backgroundColor: "#fef08a", borderColor: "#fde047" }}
                    >
                      WELCOME50
                    </span>
                    <span className="small text-muted fw-semibold">50% OFF up to ₹100</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-success fw-bold text-decoration-none p-0"
                    onClick={() => applyPromoHandler("WELCOME50")}
                  >
                    APPLY
                  </button>
                </div>

                <div
                  className="p-2 rounded-3 border d-flex align-items-center justify-content-between"
                  style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                >
                  <div>
                    <span
                      className="badge text-dark mr-2 border"
                      style={{ backgroundColor: "#e2e8f0", borderColor: "#cbd5e1" }}
                    >
                      FLAT30
                    </span>
                    <span className="small text-muted fw-semibold">Flat ₹30 OFF above ₹199</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-success fw-bold text-decoration-none p-0"
                    onClick={() => applyPromoHandler("FLAT30")}
                  >
                    APPLY
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Bill Details Card */}
          <div
            className="card shadow-sm border-0 rounded-4 p-3 p-md-4 bg-white mb-3"
            style={{ height: "auto" }}
          >
            <h6 className="fw-bold mb-3 text-dark">Bill Details</h6>

            <div className="d-flex justify-content-between mb-2 text-muted" style={{ fontSize: "0.92rem" }}>
              <span>Item Total</span>
              <span className="text-dark fw-semibold">
                <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" /> {itemTotal}
              </span>
            </div>

            <div className="d-flex justify-content-between mb-2 text-muted" style={{ fontSize: "0.92rem" }}>
              <span>
                Delivery Fee | 2.5 kms
                {isFreeDelivery && (
                  <span className="text-success small fw-semibold"> (Free on orders &gt; ₹199)</span>
                )}
              </span>
              <span>
                {isFreeDelivery ? (
                  <>
                    <del className="text-muted mr-2" style={{ textDecoration: "line-through" }}>₹35</del>
                    <span className="text-success fw-bold">FREE</span>
                  </>
                ) : (
                  <span className="text-dark fw-semibold">₹35</span>
                )}
              </span>
            </div>

            <div className="d-flex justify-content-between mb-2 text-muted" style={{ fontSize: "0.92rem" }}>
              <span>Delivery Tip</span>
              <span className="text-success fw-semibold">Add tip</span>
            </div>

            <div className="d-flex justify-content-between mb-2 text-muted" style={{ fontSize: "0.92rem" }}>
              <span>Platform Fee</span>
              <span className="text-dark fw-semibold">₹{platformFee}</span>
            </div>

            <div className="d-flex justify-content-between mb-2 text-muted" style={{ fontSize: "0.92rem" }}>
              <span>GST and Restaurant Charges (5%)</span>
              <span className="text-dark fw-semibold">₹{gstCharges}</span>
            </div>

            {discountAmount > 0 && (
              <div className="d-flex justify-content-between mb-2 text-success fw-bold" style={{ fontSize: "0.92rem" }}>
                <span>Coupon Discount ({appliedPromo})</span>
                <span>- ₹{discountAmount}</span>
              </div>
            )}

            {totalSavings > 0 && (
              <div
                className="p-2 my-2 rounded-3 text-center fw-bold small"
                style={{ background: "#ecfdf5", color: "#065f46", border: "1px dashed #10b981" }}
              >
                🎉 You saved ₹{totalSavings} on this order!
              </div>
            )}

            <hr className="my-3" />

            <div className="d-flex justify-content-between align-items-center mb-1">
              <div>
                <span className="fw-bold text-dark fs-5">TO PAY</span>
                <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  Inclusive of all taxes and charges
                </div>
              </div>
              <span className="fw-bold text-dark fs-4">
                <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" /> {finalTotal}
              </span>
            </div>
          </div>

          {/* 3. Choose Payment Method Card */}
          <div
            className="card shadow-sm border-0 rounded-4 p-3 bg-white mb-3"
            style={{ height: "auto" }}
          >
            <h6 className="fw-bold mb-2 text-dark" style={{ fontSize: "0.95rem" }}>
              Choose Payment Method
            </h6>

            {/* Online Payment Option */}
            <div
              className={`p-3 rounded-3 border mb-2 d-flex align-items-center justify-content-between ${
                paymentMode === "online" ? "border-success bg-light" : ""
              }`}
              style={{ cursor: "pointer", transition: "0.2s" }}
              onClick={() => setPaymentMode("online")}
            >
              <div className="d-flex align-items-center">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === "online"}
                  onChange={() => setPaymentMode("online")}
                  className="mr-3"
                />
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize: "0.92rem" }}>
                    <FontAwesomeIcon icon={faCreditCard} className="mr-2 text-primary" />
                    Pay Online (Stripe / Cards / UPI)
                  </div>
                  <small className="text-muted">
                    Secure redirect to Stripe payment gateway to enter card / UPI
                  </small>
                </div>
              </div>
              {paymentMode === "online" && (
                <FontAwesomeIcon icon={faCircleCheck} className="text-success" />
              )}
            </div>

            {/* Cash on Delivery Option */}
            <div
              className={`p-3 rounded-3 border d-flex align-items-center justify-content-between ${
                paymentMode === "cod" ? "border-success bg-light" : ""
              }`}
              style={{ cursor: "pointer", transition: "0.2s" }}
              onClick={() => setPaymentMode("cod")}
            >
              <div className="d-flex align-items-center">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === "cod"}
                  onChange={() => setPaymentMode("cod")}
                  className="mr-3"
                />
                <div>
                  <div className="fw-bold text-dark" style={{ fontSize: "0.92rem" }}>
                    <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2 text-success" />
                    Cash on Delivery (Pay on Delivery)
                  </div>
                  <small className="text-muted">
                    Pay in cash or UPI directly to delivery partner at your doorstep
                  </small>
                </div>
              </div>
              {paymentMode === "cod" && (
                <FontAwesomeIcon icon={faCircleCheck} className="text-success" />
              )}
            </div>
          </div>

          {/* 4. Proceed to Pay Button */}
          <button
            className="btn btn-success w-100 py-3 rounded-4 fw-bold shadow-lg d-flex align-items-center justify-content-between px-4"
            style={{
              fontSize: "1.05rem",
              background: paymentMode === "cod"
                ? "linear-gradient(135deg, #15803d 0%, #16a34a 100%)"
                : "linear-gradient(135deg, #056a3a 0%, #16a34a 100%)",
              border: "none"
            }}
            onClick={checkoutHandler}
            disabled={isProcessing}
          >
            <span>
              {isProcessing
                ? "PROCESSING..."
                : paymentMode === "cod"
                ? "PLACE ORDER (CASH ON DELIVERY)"
                : "PROCEED TO ONLINE PAYMENT"}
            </span>
            <span className="fw-bold">
              ₹{finalTotal} <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </span>
          </button>

          {/* Trust Badge */}
          <div className="text-center mt-3 text-muted small">
            <FontAwesomeIcon icon={faShieldHalved} className="mr-1 text-success" />
            100% Safe &amp; Secure Payment • Verified SSL Encrypted
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
