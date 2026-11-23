import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faStar,
  faClock,
  faComments,
  faCircleCheck
} from "@fortawesome/free-solid-svg-icons";
import { toggleFavRestaurant } from "../redux/actions/userActions";
import { toast } from "react-toastify";

const Restaurant = ({ restaurant }) => {
  const [showAI, setShowAI] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated, user } = useSelector((state) => state.user || {});

  const isFavorite = user?.favoriteRestaurants?.some(
    (r) => (r._id || r) === restaurant._id
  );

  const toggleWishlistHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please login to save to wishlist");
      navigate("/login");
      return;
    }
    dispatch(toggleFavRestaurant(restaurant._id));
    if (isFavorite) {
      toast.info(`Removed ${restaurant.name} from Wishlist`);
    } else {
      toast.success(`Added ${restaurant.name} to Wishlist! ❤️`);
    }
  };

  // Mock estimated delivery time & cost for two based on restaurant data
  const deliveryTime = restaurant.deliveryTime || 25 + (Math.abs(restaurant.name.length * 3) % 15);
  const distance = ((restaurant.name.length * 0.4) % 3 + 1.2).toFixed(1);
  const costForTwo = restaurant.isVeg ? 250 : 350;

  const getFallbackImage = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("pizza")) return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600";
    if (n.includes("burger")) return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600";
    if (n.includes("biryani")) return "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600";
    if (n.includes("chinese") || n.includes("wok") || n.includes("noodle")) return "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600";
    if (n.includes("ice cream") || n.includes("dessert")) return "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600";
    if (n.includes("cafe") || n.includes("coffee")) return "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600";
    if (n.includes("subway") || n.includes("sandwich")) return "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600";
    if (n.includes("chicken") || n.includes("kfc")) return "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600";
    return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600";
  };

  const restaurantImg = restaurant.images?.[0]?.url || getFallbackImage(restaurant.name);

  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-3 my-3">
      <div className="card h-100 restaurant-card-modern shadow-sm border-0 position-relative">
        {/* Wishlist Button */}
        <button
          type="button"
          className="btn wishlist-float-btn position-absolute"
          onClick={toggleWishlistHandler}
          title={isFavorite ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <FontAwesomeIcon
            icon={faHeart}
            className={isFavorite ? "text-danger" : "text-muted"}
            style={{ fontSize: "16px" }}
          />
        </button>

        {/* Clickable Image Container */}
        <Link to={`/restaurants/${restaurant._id}/menus`} className="restaurant-img-wrapper text-decoration-none">
          <img
            className="card-img-top restaurant-img-modern"
            src={restaurantImg}
            alt={restaurant.name}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getFallbackImage(restaurant.name);
            }}
          />
          {/* Discount Overlay */}
          <div className="restaurant-discount-badge">
            50% OFF up to ₹100
          </div>
          {/* Delivery Time Overlay */}
          <div className="restaurant-delivery-badge">
            <FontAwesomeIcon icon={faClock} className="me-1" /> {deliveryTime} MINS
          </div>
        </Link>

        {/* Card Body */}
        <div className="card-body p-3 d-flex flex-column justify-content-between">
          <div>
            {/* Title & Veg Badge */}
            <div className="d-flex align-items-start justify-content-between mb-1">
              <Link
                to={`/restaurants/${restaurant._id}/menus`}
                className="text-decoration-none text-dark"
              >
                <h5 className="restaurant-name-modern text-truncate mb-0" title={restaurant.name}>
                  {restaurant.name}
                </h5>
              </Link>
              {/* Veg / Non-Veg Indicator Icon */}
              <span
                className={`veg-indicator ms-2 ${restaurant.isVeg ? "veg" : "non-veg"}`}
                title={restaurant.isVeg ? "Pure Veg" : "Non-Veg"}
              >
                <span className="dot"></span>
              </span>
            </div>

            {/* Cuisines Subtitle */}
            <p className="text-muted small mb-1 text-truncate" style={{ fontSize: "0.85rem" }}>
              {restaurant.cuisines || (() => {
                const n = (restaurant.name || "").toLowerCase();
                if (n.includes("pizza")) return "Pizzas, Fast Food, Italian";
                if (n.includes("burger")) return "Burgers, American, Fast Food";
                if (n.includes("mcdonald")) return "Burgers, Fast Food, McCafe";
                if (n.includes("kfc")) return "Fried Chicken, Fast Food, Wings";
                if (n.includes("subway")) return "Healthy Food, Subs, Salads";
                if (n.includes("biryani")) return "Biryani, North Indian, Mughlai";
                if (n.includes("chinese") || n.includes("wok")) return "Chinese, Asian, Noodles";
                if (n.includes("ice cream") || n.includes("naturals")) return "Artisanal Ice Cream, Desserts";
                if (n.includes("coffee") || n.includes("cafe")) return "Cafe, Artisanal Coffee, Snacks";
                return "Fast Food, Indian, Beverages";
              })()}
            </p>

            {/* Address & Distance */}
            <p className="text-muted small mb-2 text-truncate" title={restaurant.address} style={{ fontSize: "0.8rem" }}>
              {restaurant.address || "FC Road, Pune"} • <strong className="text-dark">{distance} km</strong>
            </p>

            {/* Ratings & Cost */}
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="rating-pill-modern">
                <FontAwesomeIcon icon={faStar} className="me-1" />
                <span>{restaurant.ratings ? restaurant.ratings.toFixed(1) : "4.2"}</span>
                <span className="review-count-small ms-1">({restaurant.numOfReviews || 50}+)</span>
              </div>
              <span className="cost-for-two text-muted small">
                ₹{costForTwo} for two
              </span>
            </div>
          </div>

          {/* AI Review Summary (if available) */}
          {restaurant.reviewSentiment && (
            <div className="mt-2 pt-2 border-top">
              <button
                className="btn btn-outline-success btn-sm w-100 ai-pill-btn"
                onClick={() => setShowAI(!showAI)}
              >
                <FontAwesomeIcon icon={faComments} className="me-1" />
                {showAI ? "Hide AI Insights" : "AI Review Summary"}
              </button>

              {showAI && (
                <div className="ai-insights-box-modern mt-2 p-2 rounded bg-light border">
                  <div className="small fw-bold text-success mb-1">
                    Sentiment: {restaurant.reviewSentiment}
                  </div>
                  <ul className="mb-1 ps-3 small text-muted">
                    {(restaurant.reviewSummaryBullets || []).map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                  <div className="mentions-tags">
                    {(restaurant.reviewTopMentions || []).map((item, index) => (
                      <span key={index} className="badge bg-secondary me-1">
                        #{item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Restaurant;
