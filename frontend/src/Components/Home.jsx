import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  sortByRatings,
  sortByReviews,
  toggleVegOnly,
} from "../redux/slices/restaurantSlice";
import { getRestaurants } from "../redux/actions/restaurantAction";
import { addItemToCart } from "../redux/actions/cartActions";
import Restaurant from "./Restaurant";
import ReviewModal from "./ReviewModal";
import Loader from "./layout/Loader";
import Message from "./Message";
import CountRestaurant from "./CountRestaurant";
import api from "../utils/api";
import { getFilteredMockFoodItems } from "../mock/mockData";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFire,
  faStar,
  faClock,
  faSliders,
  faTag,
  faLeaf,
  faRotateRight,
  faArrowRight,
  faUtensils,
  faStore,
  faPlus,
  faMinus,
  faCheck,
  faSpinner,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";

// Food categories like Swiggy / Zomato with authentic HD food photography
const CUISINE_CATEGORIES = [
  {
    name: "All",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=250&auto=format&fit=crop&q=80",
    keyword: "",
  },
  {
    name: "Biryani",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=250&auto=format&fit=crop&q=80",
    keyword: "Biryani",
  },
  {
    name: "Pizza",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=250&auto=format&fit=crop&q=80",
    keyword: "Pizza",
  },
  {
    name: "Burger",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=250&auto=format&fit=crop&q=80",
    keyword: "Burger",
  },
  {
    name: "North Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=250&auto=format&fit=crop&q=80",
    keyword: "Indian",
  },
  {
    name: "Chinese & Momos",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=250&auto=format&fit=crop&q=80",
    keyword: "Momo",
  },
  {
    name: "Rolls & Wraps",
    image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=250&auto=format&fit=crop&q=80",
    keyword: "Roll",
  },
  {
    name: "Sweets & Chaat",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=250&auto=format&fit=crop&q=80",
    keyword: "Haldiram",
  },
  {
    name: "Desserts & Cakes",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=250&auto=format&fit=crop&q=80",
    keyword: "Sweet",
  },
  {
    name: "Coffee & Drinks",
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=250&auto=format&fit=crop&q=80",
    keyword: "Coffee",
  },
];

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { keyword } = useParams();

  const {
    restaurants = [],
    loading: restaurantsLoading,
    error: restaurantsError,
    showVegOnly,
  } = useSelector((state) => state.restaurants);

  const { cartItems = [] } = useSelector((state) => state.carts || {});

  // Tab View: 'restaurants' or 'dishes'
  const [activeTab, setActiveTab] = useState(keyword ? "dishes" : "restaurants");
  const [activeSort, setActiveSort] = useState("default");
  const [minRatingFilter, setMinRatingFilter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Food Items State (from DB Search & Filter API)
  const [foodItems, setFoodItems] = useState([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodPriceFilter, setFoodPriceFilter] = useState(""); // '' | 'under200' | '200-400' | 'above400'
  const [foodSortBy, setFoodSortBy] = useState(""); // '' | 'price_asc' | 'price_desc' | 'rating_desc'
  const [reviewFoodItem, setReviewFoodItem] = useState(null);

  // Fetch Restaurants on load or keyword change
  useEffect(() => {
    dispatch(getRestaurants(keyword));
    if (keyword) {
      const match = CUISINE_CATEGORIES.find(
        (c) => c.keyword && c.keyword.toLowerCase() === keyword.toLowerCase()
      );
      if (match) setSelectedCategory(match.name);
    } else {
      setSelectedCategory("All");
    }
  }, [dispatch, keyword]);

  // Fetch Food Items when search/filters change
  useEffect(() => {
    fetchDishes();
  }, [keyword, selectedCategory, showVegOnly, minRatingFilter, foodPriceFilter, foodSortBy]);

  const fetchDishes = async () => {
    setFoodLoading(true);
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (selectedCategory && selectedCategory !== "All") params.category = selectedCategory;
      if (showVegOnly) params.isVeg = true;
      if (minRatingFilter) params.minRating = 4.0;

      if (foodPriceFilter === "under200") {
        params.maxPrice = 199;
      } else if (foodPriceFilter === "200-400") {
        params.minPrice = 200;
        params.maxPrice = 400;
      } else if (foodPriceFilter === "above400") {
        params.minPrice = 401;
      }

      if (foodSortBy) {
        params.sortBy = foodSortBy;
      }

      const res = await api.get("/v1/foods/search", { params });
      setFoodItems(res.data.foodItems || []);
    } catch (err) {
      console.warn("Backend unavailable, loading offline fallback foods:", err.message);
      setFoodItems(getFilteredMockFoodItems(params));
    } finally {
      setFoodLoading(false);
    }
  };

  // Handlers for sorting & filtering
  const handleSortByRatings = () => {
    if (activeSort === "ratings") {
      setActiveSort("default");
      setFoodSortBy("");
      dispatch(getRestaurants(keyword));
    } else {
      setActiveSort("ratings");
      setFoodSortBy("rating_desc");
      dispatch(sortByRatings());
    }
  };

  const handleSortByReviews = () => {
    if (activeSort === "reviews") {
      setActiveSort("default");
      dispatch(getRestaurants(keyword));
    } else {
      setActiveSort("reviews");
      dispatch(sortByReviews());
    }
  };

  const handleToggleVegOnly = () => {
    dispatch(toggleVegOnly());
  };

  const handleToggleMinRating = () => {
    setMinRatingFilter(!minRatingFilter);
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat.name);
    if (cat.keyword) {
      navigate(`/v1/restaurants/search/${cat.keyword}`);
    } else {
      navigate("/");
    }
  };

  const handleResetFilters = () => {
    setActiveSort("default");
    setMinRatingFilter(false);
    setSelectedCategory("All");
    setFoodPriceFilter("");
    setFoodSortBy("");
    if (showVegOnly) {
      dispatch(toggleVegOnly());
    }
    navigate("/");
    dispatch(getRestaurants(""));
  };

  const handleAddFoodToCart = async (dish) => {
    const restaurantId = dish.restaurant?._id || dish.restaurant;
    if (!restaurantId) {
      toast.error("Restaurant details not found for this dish");
      return;
    }
    try {
      await dispatch(addItemToCart(dish._id, 1, restaurantId));
      toast.success(`Added ${dish.name} to cart!`);
    } catch (err) {
      toast.error("Could not add item to cart");
    }
  };

  // Filter list by veg only and rating
  const displayedRestaurants = useMemo(() => {
    let list = [...(restaurants || [])];

    if (showVegOnly) {
      list = list.filter((r) => r.isVeg);
    }

    if (minRatingFilter) {
      list = list.filter((r) => (r.ratings || 0) >= 4.0);
    }

    return list;
  }, [restaurants, showVegOnly, minRatingFilter]);

  // Active filters count for reset badge
  const activeFiltersCount = useMemo(() => {
    return (
      (showVegOnly ? 1 : 0) +
      (minRatingFilter ? 1 : 0) +
      (activeSort !== "default" ? 1 : 0) +
      (foodPriceFilter ? 1 : 0) +
      (keyword ? 1 : 0) +
      (selectedCategory !== "All" ? 1 : 0)
    );
  }, [showVegOnly, minRatingFilter, activeSort, foodPriceFilter, keyword, selectedCategory]);

  return (
    <div className="home-container pb-5">
      {/* 1. Promotional Deals Banner Strip */}
      <div className="promo-banner-strip my-3">
        <div className="row g-3">
          {/* Deal 1: Flat 50% OFF */}
          <div className="col-12 col-md-4">
            <div
              className="promo-hero-card promo-hero-orange"
              onClick={() => {
                setActiveTab("dishes");
                navigate("/v1/restaurants/search/Pizza");
              }}
              title="Click to explore 50% OFF Deals"
            >
              <div>
                <span className="promo-glass-badge">⚡ SPECIAL DEAL</span>
                <h5 className="promo-hero-title">Flat 50% OFF</h5>
                <p className="promo-hero-subtitle">Craving cheesy pizzas & burgers?</p>
                <div className="promo-coupon-tag">USE: WELCOME50</div>
              </div>
              <div>
                <span className="promo-cta-btn">
                  Order Now <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: "0.68rem" }} />
                </span>
              </div>
              <img
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=350&auto=format&fit=crop&q=80"
                alt="Flat 50% OFF"
                className="promo-hero-bg-img"
              />
            </div>
          </div>

          {/* Deal 2: Free Delivery */}
          <div className="col-12 col-md-4">
            <div
              className="promo-hero-card promo-hero-teal"
              onClick={() => navigate("/")}
              title="Click to explore Free Delivery restaurants"
            >
              <div>
                <span className="promo-glass-badge">⚡ SUPERFAST</span>
                <h5 className="promo-hero-title">Free Delivery</h5>
                <p className="promo-hero-subtitle">Zero delivery fee on orders above ₹199</p>
                <div className="promo-coupon-tag">NO CODE NEEDED</div>
              </div>
              <div>
                <span className="promo-cta-btn">
                  Explore Deals <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: "0.68rem" }} />
                </span>
              </div>
              <img
                src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=350&auto=format&fit=crop&q=80"
                alt="Free Delivery"
                className="promo-hero-bg-img"
              />
            </div>
          </div>

          {/* Deal 3: Gourmet Biryanis */}
          <div className="col-12 col-md-4">
            <div
              className="promo-hero-card promo-hero-purple"
              onClick={() => {
                setActiveTab("dishes");
                navigate("/v1/restaurants/search/Biryani");
              }}
              title="Click to explore Gourmet Biryanis"
            >
              <div>
                <span className="promo-glass-badge">👑 TOP PICKS</span>
                <h5 className="promo-hero-title">Royal Biryanis</h5>
                <p className="promo-hero-subtitle">Handcrafted dum biryanis from ₹199</p>
                <div className="promo-coupon-tag">BEST RATED CHEFS</div>
              </div>
              <div>
                <span className="promo-cta-btn">
                  Taste Now <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: "0.68rem" }} />
                </span>
              </div>
              <img
                src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=350&auto=format&fit=crop&q=80"
                alt="Royal Biryanis"
                className="promo-hero-bg-img"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. "What's on your mind?" Category Row */}
      <div className="cuisine-carousel-wrapper my-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="fw-bold mb-0 d-flex align-items-center text-dark">
            <span className="me-2 fs-5">🍽️</span> What's on your mind?
          </h4>
          <span className="text-muted small fw-semibold d-none d-sm-inline">
            Scroll for more cuisines →
          </span>
        </div>
        <div className="cuisine-circle-row d-flex align-items-center gap-3 overflow-auto pb-2">
          {CUISINE_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                className="cuisine-circle-item d-flex flex-column align-items-center"
                onClick={() => handleCategoryClick(cat)}
                title={`Explore ${cat.name}`}
              >
                <div className={`cuisine-img-ring mb-2 ${isActive ? "active-ring" : ""}`}>
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="cuisine-circle-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=250";
                    }}
                  />
                </div>
                <span className={`cuisine-name-label ${isActive ? "text-success fw-bold" : ""}`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="my-4 text-muted opacity-25" />

      {/* 3. Primary Navigation Toggle: Restaurants vs Dishes */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div className="btn-group p-1 bg-light rounded-pill border shadow-sm">
          <button
            type="button"
            className={`btn rounded-pill px-4 fw-bold btn-sm ${
              activeTab === "restaurants" ? "btn-dark text-white shadow-sm" : "btn-light text-muted"
            }`}
            onClick={() => setActiveTab("restaurants")}
          >
            <FontAwesomeIcon icon={faStore} className="me-2 text-warning" />
            Restaurants ({displayedRestaurants.length})
          </button>
          <button
            type="button"
            className={`btn rounded-pill px-4 fw-bold btn-sm ${
              activeTab === "dishes" ? "btn-dark text-white shadow-sm" : "btn-light text-muted"
            }`}
            onClick={() => setActiveTab("dishes")}
          >
            <FontAwesomeIcon icon={faUtensils} className="me-2 text-warning" />
            Dishes & Food ({foodItems.length})
          </button>
        </div>

        {keyword && (
          <div className="badge bg-warning text-dark px-3 py-2 rounded-pill small">
            Showing results for "{keyword}"
          </div>
        )}
      </div>

      {/* 4. Filter and Sort Toolbar */}
      <div className="filter-toolbar-wrapper my-3">
        <div className="filter-pills-group d-flex flex-wrap gap-2 align-items-center">
          {/* Pure Veg Pill */}
          <button
            type="button"
            className={`swiggy-filter-pill ${showVegOnly ? "active-veg" : ""}`}
            onClick={handleToggleVegOnly}
            title={showVegOnly ? "Click to show all items" : "Filter by Pure Veg only"}
          >
            <span className="veg-badge-icon"></span>
            <span>Pure Veg</span>
            {showVegOnly && <span className="pill-close-icon">✕</span>}
          </button>

          {/* Rating 4.0+ Pill */}
          <button
            type="button"
            className={`swiggy-filter-pill ${minRatingFilter ? "active-rating" : ""}`}
            onClick={handleToggleMinRating}
            title={minRatingFilter ? "Click to clear rating filter" : "Filter with 4.0+ rating"}
          >
            <FontAwesomeIcon icon={faStar} className="text-warning" />
            <span>Ratings 4.0+</span>
            {minRatingFilter && <span className="pill-close-icon">✕</span>}
          </button>

          {/* Top Rated Pill */}
          <button
            type="button"
            className={`swiggy-filter-pill ${activeSort === "ratings" ? "active-toprated" : ""}`}
            onClick={handleSortByRatings}
            title={activeSort === "ratings" ? "Click to reset sort" : "Sort by highest ratings"}
          >
            <FontAwesomeIcon
              icon={faStar}
              className={activeSort === "ratings" ? "text-warning" : "text-muted"}
            />
            <span>Top Rated</span>
            {activeSort === "ratings" && <span className="pill-close-icon">✕</span>}
          </button>

          {/* Price Range Filter (Only for Dishes) */}
          {activeTab === "dishes" && (
            <>
              <button
                type="button"
                className={`swiggy-filter-pill ${foodPriceFilter === "under200" ? "active-rating" : ""}`}
                onClick={() => setFoodPriceFilter(foodPriceFilter === "under200" ? "" : "under200")}
              >
                <span>Under ₹200</span>
                {foodPriceFilter === "under200" && <span className="pill-close-icon">✕</span>}
              </button>

              <button
                type="button"
                className={`swiggy-filter-pill ${foodPriceFilter === "200-400" ? "active-rating" : ""}`}
                onClick={() => setFoodPriceFilter(foodPriceFilter === "200-400" ? "" : "200-400")}
              >
                <span>₹200 - ₹400</span>
                {foodPriceFilter === "200-400" && <span className="pill-close-icon">✕</span>}
              </button>

              <button
                type="button"
                className={`swiggy-filter-pill ${foodPriceFilter === "above400" ? "active-rating" : ""}`}
                onClick={() => setFoodPriceFilter(foodPriceFilter === "above400" ? "" : "above400")}
              >
                <span>₹400+</span>
                {foodPriceFilter === "above400" && <span className="pill-close-icon">✕</span>}
              </button>
            </>
          )}

          {/* Reset Filters Pill */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              className="swiggy-filter-pill active-reset"
              onClick={handleResetFilters}
              title="Clear all active filters"
            >
              <FontAwesomeIcon icon={faRotateRight} />
              <span>Reset All</span>
              <span className="badge rounded-pill bg-danger text-white ms-1" style={{ fontSize: "0.72rem" }}>
                {activeFiltersCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 5. CONTENT AREA */}
      {activeTab === "restaurants" ? (
        <>
          {/* Restaurant Count */}
          <CountRestaurant />

          {/* Restaurants Responsive Grid */}
          {restaurantsLoading ? (
            <Loader />
          ) : restaurantsError ? (
            <Message variant="danger">{restaurantsError}</Message>
          ) : (
            <div className="row mt-2 g-4">
              {displayedRestaurants.length > 0 ? (
                displayedRestaurants.map((restaurant) => (
                  <Restaurant key={restaurant._id} restaurant={restaurant} />
                ))
              ) : (
                <div className="col-12 py-5 text-center bg-white rounded-4 shadow-sm my-3">
                  <div className="fs-1 mb-2">🍽️</div>
                  <h4 className="fw-bold">No restaurants match your filters</h4>
                  <p className="text-muted">Try clearing some filters or searching for something else.</p>
                  <button className="btn btn-outline-success rounded-pill mt-2" onClick={handleResetFilters}>
                    View All Restaurants
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Dishes & Food Items Responsive Grid */
        <div className="dishes-content-area mt-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold text-dark mb-0">
              {keyword ? `Dishes matching "${keyword}"` : "Popular Dishes & Food Items"}
            </h5>
            <span className="text-muted small">Showing {foodItems.length} dishes</span>
          </div>

          {foodLoading ? (
            <div className="text-center py-5">
              <FontAwesomeIcon icon={faSpinner} className="fa-spin text-warning fs-1 mb-3" />
              <h6 className="text-muted">Searching delicious dishes...</h6>
            </div>
          ) : foodItems.length === 0 ? (
            <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white my-3">
              <div className="fs-1 mb-2">🍕</div>
              <h4 className="fw-bold text-dark">No dishes found</h4>
              <p className="text-muted small mx-auto" style={{ maxWidth: "420px" }}>
                We couldn't find any food items matching your search criteria. Try a different dish name or reset filters!
              </p>
              <div>
                <button className="btn btn-warning rounded-pill px-4 fw-bold" onClick={handleResetFilters}>
                  Reset All Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {foodItems.map((dish) => {
                const imgUrl =
                  dish.image?.[0]?.url ||
                  dish.images?.[0]?.url ||
                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500";

                const inCart = cartItems.find((i) => {
                  const id = i.foodItem?._id || i.foodItem || i._id;
                  return id === dish._id;
                });

                return (
                  <div key={dish._id} className="col-12 col-sm-6 col-lg-3">
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100 dish-card bg-white position-relative">
                      {/* Image Thumbnail with Veg/Non-Veg Tag */}
                      <div className="position-relative" style={{ height: "180px", overflow: "hidden" }}>
                        <img
                          src={imgUrl}
                          alt={dish.name}
                          className="w-100 h-100"
                          style={{ objectFit: "cover", transition: "0.3s" }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500";
                          }}
                        />
                        <span
                          className={`badge position-absolute top-0 start-0 m-2 px-2 py-1 rounded-pill ${
                            dish.isVeg ? "bg-success" : "bg-danger"
                          }`}
                          style={{ fontSize: "0.72rem" }}
                        >
                          {dish.isVeg ? "Veg" : "Non-Veg"}
                        </span>

                        {dish.ratings > 0 && (
                          <span
                            className="badge bg-dark bg-opacity-75 text-white position-absolute bottom-0 end-0 m-2 px-2 py-1 rounded-pill small"
                          >
                            <FontAwesomeIcon icon={faStar} className="text-warning me-1" />
                            {dish.ratings} ({dish.numberOfReviews || 0})
                          </span>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="card-body p-3 d-flex flex-column justify-content-between">
                        <div>
                          <h6 className="fw-bold mb-1 text-dark text-truncate" title={dish.name}>
                            {dish.name}
                          </h6>

                          {/* Restaurant Name */}
                          {dish.restaurant && (
                            <Link
                              to={`/restaurants/${dish.restaurant._id}/menus`}
                              className="text-muted small d-block text-truncate text-decoration-none mb-1"
                              title={dish.restaurant.name}
                            >
                              <FontAwesomeIcon icon={faStore} className="me-1 text-warning" />
                              {dish.restaurant.name}
                            </Link>
                          )}

                          <p
                            className="text-secondary small mb-2 text-truncate-2"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              minHeight: "36px",
                              fontSize: "0.8rem",
                            }}
                          >
                            {dish.description}
                          </p>
                        </div>

                        {/* Price & Add to Cart */}
                        <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-auto">
                          <div>
                            <span className="fw-bold text-dark fs-6">₹{dish.price}</span>
                          </div>

                          <div className="d-flex gap-1">
                            <button
                              type="button"
                              className="btn btn-outline-warning btn-sm rounded-pill px-2 py-1 small"
                              title="Rate this dish"
                              onClick={() => setReviewFoodItem(dish)}
                            >
                              <FontAwesomeIcon icon={faStar} />
                            </button>

                            <button
                              type="button"
                              className={`btn btn-sm rounded-pill px-3 fw-bold ${
                                inCart ? "btn-success" : "btn-warning"
                              }`}
                              onClick={() => handleAddFoodToCart(dish)}
                            >
                              {inCart ? (
                                <>
                                  <FontAwesomeIcon icon={faCheck} className="me-1" /> Added
                                </>
                              ) : (
                                "+ Add"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {reviewFoodItem && (
        <ReviewModal
          foodItem={reviewFoodItem}
          onClose={() => setReviewFoodItem(null)}
          onReviewSubmitted={() => {
            fetchDishes();
          }}
        />
      )}
    </div>
  );
};

export default Home;
