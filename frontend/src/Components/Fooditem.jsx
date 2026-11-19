import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faIndianRupeeSign,
  faHeart,
  faStar,
  faPlus,
  faMinus,
  faBolt
} from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addItemToCart, updateCartItem, removeCartItem } from "../redux/actions/cartActions";
import { toggleFavFoodItem } from "../redux/actions/userActions";
import { getFoodItemImage } from "../utils/foodImages";
import { toast } from "react-toastify";
import api from "../utils/api";

const Fooditem = ({ fooditem, restaurant }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isAuthenticated } = useSelector((state) => state.user || {});
  const { cartItems = [] } = useSelector((state) => state.carts || {});

  // Match item in cart to keep stepper state persistent
  const cartItem = cartItems.find((item) => {
    const itemFoodId = item.foodItem?._id || item.foodItem?.id || item._id;
    return itemFoodId === fooditem._id;
  });

  const inCart = !!cartItem;
  const quantity = cartItem?.quantity || 1;

  const isFavorite = user?.favoriteFoodItems?.some(
    (item) => (item._id || item) === fooditem._id
  );

  const isVeg = fooditem.isVeg !== undefined ? fooditem.isVeg : (!fooditem.name?.toLowerCase().includes("chicken") && !fooditem.name?.toLowerCase().includes("mutton") && !fooditem.name?.toLowerCase().includes("salmon") && !fooditem.name?.toLowerCase().includes("fish"));

  const wishlistToggleHandler = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please login to save to wishlist");
      navigate("/login");
      return;
    }
    dispatch(toggleFavFoodItem(fooditem._id));
    if (isFavorite) {
      toast.info(`Removed ${fooditem.name} from Wishlist`);
    } else {
      toast.success(`Added ${fooditem.name} to Wishlist! ❤️`);
    }
  };

  // Add button click
  const addToCartHandler = () => {
    dispatch(
      addItemToCart(
        fooditem._id,
        restaurant,
        1,
        fooditem,
        { _id: restaurant }
      )
    );
    toast.success(`Added ${fooditem.name} to cart! 🛒`);
  };

  // Increase quantity
  const increaseQty = () => {
    if (quantity < (fooditem.stock || 100)) {
      dispatch(updateCartItem(fooditem._id, quantity + 1));
    }
  };

  // Decrease quantity
  const decreaseQty = () => {
    if (quantity > 1) {
      dispatch(updateCartItem(fooditem._id, quantity - 1));
    } else {
      dispatch(removeCartItem(fooditem._id));
      toast.info(`Removed ${fooditem.name} from cart`);
    }
  };

  const buyNowHandler = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to buy items");
      navigate("/login");
      return;
    }
    try {
      const { data } = await api.post("/v1/payment/process", {
        email: user?.email,
        items: [
          {
            foodItem: fooditem,
            quantity: 1,
          },
        ],
      });

      if (data.success && data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Unable to start payment process.");
    }
  };

  const rawImg = fooditem.image?.[0]?.url || fooditem.images?.[0]?.url || "";
  const imgUrl = getFoodItemImage(fooditem.name, rawImg);

  return (
    <div className="col-12 col-md-6 my-2">
      <div className="card fooditem-card-modern shadow-sm border-0 p-3 h-100">
        <div className="row g-3 align-items-center">
          {/* Dish Details */}
          <div className="col-7 d-flex flex-column justify-content-between h-100">
            <div>
              {/* Veg / Non-Veg Indicator */}
              <div className="d-flex align-items-center mb-1">
                <span className={`veg-indicator ${isVeg ? "veg" : "non-veg"} me-2`}>
                  <span className="dot"></span>
                </span>
                {fooditem.ratings ? (
                  <span className="badge bg-light text-warning border small px-2 py-0">
                    <FontAwesomeIcon icon={faStar} className="me-1" />
                    {fooditem.ratings}
                  </span>
                ) : (
                  <span className="badge bg-light text-success border small px-2 py-0">
                    Bestseller
                  </span>
                )}
              </div>

              {/* Dish Name */}
              <h6 className="fw-bold mb-1 text-dark">{fooditem.name}</h6>

              {/* Price */}
              <div className="fw-bold text-dark fs-6 mb-1">
                <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" className="me-1" />
                {fooditem.price}
              </div>

              {/* Description */}
              <p className="fooditem-desc-text text-muted small mb-2 line-clamp-2">
                {fooditem.description || "Freshly prepared with authentic ingredients and aromatic spices."}
              </p>
            </div>

            {/* Quick Buy Now Link */}
            <div>
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none small text-success fw-bold"
                onClick={buyNowHandler}
              >
                <FontAwesomeIcon icon={faBolt} className="me-1" /> Instant Buy
              </button>
            </div>
          </div>

          {/* Dish Image + Add Stepper */}
          <div className="col-5 position-relative text-center">
            {/* Wishlist Button */}
            <button
              type="button"
              className="btn wishlist-mini-btn position-absolute top-0 end-0 m-1"
              onClick={wishlistToggleHandler}
              title={isFavorite ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              <FontAwesomeIcon
                icon={faHeart}
                className={isFavorite ? "text-danger" : "text-muted"}
                style={{ fontSize: "14px" }}
              />
            </button>

            {/* Image */}
            <div className="fooditem-img-container rounded-3 overflow-hidden shadow-sm">
              <img
                src={imgUrl}
                alt={fooditem.name}
                className="fooditem-img-modern"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getFoodItemImage(fooditem.name, "");
                }}
              />
            </div>

            {/* Add / Stepper Button */}
            <div className="fooditem-btn-overlay">
              {!inCart ? (
                <div>
                  <button
                    type="button"
                    className="btn btn-add-pill shadow-sm"
                    disabled={fooditem.stock === 0}
                    onClick={addToCartHandler}
                  >
                    ADD <FontAwesomeIcon icon={faPlus} className="ms-1" size="xs" />
                  </button>
                  <span className="d-block text-muted mt-1" style={{ fontSize: "0.65rem", fontWeight: "600" }}>
                    customisable
                  </span>
                </div>
              ) : (
                <div className="fooditem-stepper shadow-sm d-inline-flex align-items-center">
                  <button className="stepper-btn minus" onClick={decreaseQty}>
                    <FontAwesomeIcon icon={faMinus} size="xs" />
                  </button>
                  <span className="stepper-qty px-2 fw-bold">{quantity}</span>
                  <button className="stepper-btn plus" onClick={increaseQty}>
                    <FontAwesomeIcon icon={faPlus} size="xs" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fooditem;
