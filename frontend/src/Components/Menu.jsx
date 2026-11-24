import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, Link } from "react-router-dom";
import { getMenus } from "../redux/actions/menuActions";
import Fooditem from "./Fooditem";
import api from "../utils/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faClock,
  faLocationDot,
  faLeaf,
  faSearch,
  faBagShopping,
  faArrowRight,
  faIndianRupeeSign
} from "@fortawesome/free-solid-svg-icons";

const Menu = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  const { menus = [], loading, error } = useSelector((state) => state.menus);
  const { restaurants = [] } = useSelector((state) => state.restaurants);
  const { cartItems = [] } = useSelector((state) => state.carts || {});

  // Calculate cart total & items count
  const totalCartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }, [cartItems]);

  const totalCartPrice = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const price = item.foodItem?.price || 0;
      return acc + (item.quantity || 1) * price;
    }, 0);
  }, [cartItems]);

  const [menuSearch, setMenuSearch] = useState("");
  const [menuVegOnly, setMenuVegOnly] = useState(false);
  const [dismissCartBar, setDismissCartBar] = useState(false);

  const [restaurantDetail, setRestaurantDetail] = useState(null);

  useEffect(() => {
    if (totalCartCount === 0) {
      setDismissCartBar(false);
    }
  }, [totalCartCount]);

  useEffect(() => {
    dispatch(getMenus(id));
  }, [dispatch, id]);

  useEffect(() => {
    const found = restaurants.find((r) => r._id === id);
    if (found) {
      setRestaurantDetail(found);
    } else if (id) {
      api
        .get(`/v1/restaurants/${id}`)
        .then((res) => {
          setRestaurantDetail(res.data?.restaurant || res.data?.data || null);
        })
        .catch((err) => {
          console.error("Failed to load restaurant details from backend:", err.message);
        });
    }
  }, [restaurants, id]);

  // Find restaurant details
  const currentRestaurant = useMemo(() => {
    return (
      restaurantDetail ||
      restaurants.find((r) => r._id === id) || {
        name: "Restaurant",
        address: "",
        ratings: 0,
        numOfReviews: 0,
        isVeg: false,
      }
    );
  }, [restaurantDetail, restaurants, id]);

  // Filter food items based on veg-only and in-menu search
  const filteredMenus = useMemo(() => {
    if (!Array.isArray(menus)) return [];

    return menus
      .map((category) => {
        const filteredItems = (category.foodItems || []).filter((item) => {
          // Veg filter
          if (menuVegOnly && !item.isVeg && (item.name?.toLowerCase().includes("chicken") || item.name?.toLowerCase().includes("mutton") || item.name?.toLowerCase().includes("salmon"))) {
            return false;
          }
          // Search filter
          if (menuSearch.trim()) {
            const kw = menuSearch.toLowerCase().trim();
            const nameMatch = item.name?.toLowerCase().includes(kw);
            const descMatch = item.description?.toLowerCase().includes(kw);
            return nameMatch || descMatch;
          }
          return true;
        });

        return {
          ...category,
          foodItems: filteredItems,
        };
      })
      .filter((category) => category.foodItems.length > 0);
  }, [menus, menuVegOnly, menuSearch]);

  return (
    <div className="menu-page-container container my-4 pb-5 position-relative">
      {/* 1. Restaurant Overview Hero Banner */}
      <div className="restaurant-overview-card shadow-sm p-4 rounded-4 mb-4 bg-white border">
        <div className="row align-items-center">
          <div className="col-12 col-md-7">
            <div className="d-flex align-items-center mb-2">
              <h2 className="fw-bold mb-0 me-3">{currentRestaurant.name}</h2>
              <span
                className="badge text-white px-2 py-1"
                style={{
                  fontSize: "0.72rem",
                  fontWeight: "700",
                  letterSpacing: "0.5px",
                  backgroundColor: currentRestaurant.isVeg ? "#16a34a" : "#dc2626"
                }}
              >
                {currentRestaurant.isVeg ? "PURE VEG" : "NON-VEG"}
              </span>
            </div>
            <p className="text-muted mb-2">
              <FontAwesomeIcon icon={faLocationDot} className="me-1 text-danger" />
              {currentRestaurant.address || "FC Road, Pune"}
            </p>
            <div className="d-flex flex-wrap align-items-center gap-3">
              <div className="rating-pill-modern px-3 py-1">
                <FontAwesomeIcon icon={faStar} className="me-1" />
                <span>{currentRestaurant.ratings ? currentRestaurant.ratings.toFixed(1) : "4.4"}</span>
                <span className="ms-1 opacity-75">({currentRestaurant.numOfReviews || 120}+ Reviews)</span>
              </div>
              <div className="delivery-time-pill text-muted small">
                <FontAwesomeIcon icon={faClock} className="me-1 text-primary" />
                25-30 MINS Delivery Time
              </div>
            </div>
          </div>
          <div className="col-12 col-md-5 mt-3 mt-md-0 text-md-end">
            <div
              className="p-3 rounded-3 border d-inline-block text-start shadow-sm"
              style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
            >
              <div className="d-flex align-items-center mb-1">
                <span
                  className="badge text-white px-2 py-1 me-2"
                  style={{ fontSize: "0.72rem", backgroundColor: "#16a34a" }}
                >
                  OPEN NOW
                </span>
                <small className="text-muted fw-semibold">
                  <FontAwesomeIcon icon={faClock} className="me-1 text-primary" /> 25-30 mins
                </small>
              </div>
              <div className="small fw-bold text-dark mt-1">
                🏷️ 50% OFF up to ₹100{" "}
                <span className="text-muted fw-normal">| Use</span>{" "}
                <span
                  className="badge text-dark ms-1 border"
                  style={{ backgroundColor: "#fef08a", borderColor: "#fde047" }}
                >
                  WELCOME50
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Menu Search & Filters Bar */}
      <div className="menu-filter-bar p-3 rounded-4 bg-white shadow-sm mb-4 border d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center flex-grow-1" style={{ maxWidth: "450px" }}>
          <div className="input-group">
            <span className="input-group-text bg-light border-0">
              <FontAwesomeIcon icon={faSearch} className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-0 bg-light"
              placeholder="Search for dishes in this restaurant..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className={`btn btn-sm filter-pill-btn ${
              menuVegOnly ? "btn-success text-white" : "btn-outline-secondary bg-white"
            }`}
            onClick={() => setMenuVegOnly(!menuVegOnly)}
          >
            <FontAwesomeIcon icon={faLeaf} className="me-1" />
            Veg Only
          </button>
        </div>
      </div>

      {/* 3. Menus List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status"></div>
          <p className="mt-2 text-muted">Loading delicious menu...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : filteredMenus.length > 0 ? (
        filteredMenus.map((category) => (
          <div key={category._id} className="menu-category-section mb-4">
            <div className="d-flex align-items-center justify-content-between pb-2 mb-3 border-bottom">
              <h4 className="fw-bold mb-0 text-dark">
                {category.name}
                <span className="badge bg-light text-muted ms-2 fs-6">
                  {category.foodItems.length}
                </span>
              </h4>
            </div>

            <div className="row g-3">
              {category.foodItems.map((fooditem) => (
                <Fooditem
                  key={fooditem._id}
                  fooditem={fooditem}
                  restaurant={id}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-5 bg-white rounded-4 shadow-sm border">
          <div className="fs-1 mb-2">🍽️</div>
          <h5 className="fw-bold">No dishes found matching your search</h5>
          <p className="text-muted">Try clearing the search or veg filter.</p>
          <button
            className="btn btn-outline-success btn-sm"
            onClick={() => {
              setMenuSearch("");
              setMenuVegOnly(false);
            }}
          >
            Reset Menu Filters
          </button>
        </div>
      )}

      {/* 4. Sticky Floating "View Cart" Bar (Swiggy / Zomato style with Dismiss Option) */}
      {totalCartCount > 0 && !dismissCartBar && (
        <div className="sticky-bottom-cart-bar shadow-lg p-3 rounded-4 bg-dark text-white d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <span className="cart-floating-icon me-3 bg-success rounded-circle p-2">
              <FontAwesomeIcon icon={faBagShopping} />
            </span>
            <div>
              <div className="fw-bold fs-6">
                {totalCartCount} {totalCartCount === 1 ? "Item" : "Items"} | <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" /> {totalCartPrice}
              </div>
              <small className="text-white-50">Extra charges may apply</small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Link to="/cart" className="btn btn-success fw-bold px-4 rounded-pill d-flex align-items-center">
              View Cart <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
            </Link>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center text-white"
              style={{ width: "32px", height: "32px", border: "1px solid rgba(255,255,255,0.3)" }}
              onClick={() => setDismissCartBar(true)}
              title="Dismiss cart bar"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
