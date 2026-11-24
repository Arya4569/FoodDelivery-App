import React, { useState, useEffect, useRef } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBagShopping,
  faHeart,
  faMotorcycle,
  faLocationDot,
  faUser,
  faBoxOpen,
  faStore,
  faRightFromBracket,
  faChevronDown,
  faCrosshairs,
  faSearch,
  faTimes,
  faCheck,
  faMapPin,
  faGlobe,
  faSpinner
} from "@fortawesome/free-solid-svg-icons";
import Search from "./Search";
import api from "../../utils/api";
import "../../App.css";
import { logout } from "../../redux/actions/userActions";
import { toast } from "react-toastify";
import NotificationBell from "../Notifications/NotificationBell";

// Major Indian Metros for Quick Selection
const METRO_CITIES = [
  { area: "FC Road, Pune", city: "Pune", state: "Maharashtra", time: "20-25 mins" },
  { area: "Kothrud, Pune", city: "Pune", state: "Maharashtra", time: "20-25 mins" },
  { area: "Baner, Pune", city: "Pune", state: "Maharashtra", time: "25-30 mins" },
  { area: "Hinjewadi, Pune", city: "Pune", state: "Maharashtra", time: "30-35 mins" },
  { area: "Viman Nagar, Pune", city: "Pune", state: "Maharashtra", time: "25-30 mins" },
  { area: "Bandra West, Mumbai", city: "Mumbai", state: "Maharashtra", time: "30-35 mins" },
  { area: "Andheri East, Mumbai", city: "Mumbai", state: "Maharashtra", time: "35-40 mins" },
  { area: "Dadar, Mumbai", city: "Mumbai", state: "Maharashtra", time: "25-30 mins" },
  { area: "Indiranagar, Bengaluru", city: "Bengaluru", state: "Karnataka", time: "30-35 mins" },
  { area: "Koramangala, Bengaluru", city: "Bengaluru", state: "Karnataka", time: "30-35 mins" },
  { area: "Connaught Place, New Delhi", city: "Delhi", state: "Delhi", time: "25-30 mins" },
  { area: "Banjara Hills, Hyderabad", city: "Hyderabad", state: "Telangana", time: "30-35 mins" },
];

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showMenu, setShowMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Persistent selected location (defaults to checking storage or real-time auto-detect)
  const [location, setLocation] = useState(() => {
    try {
      const saved = localStorage.getItem("fooddelivery_location");
      return saved
        ? JSON.parse(saved)
        : { area: "Detecting Location...", city: "Locating", time: "20-25 mins", isRealtime: false };
    } catch (e) {
      return { area: "Detecting Location...", city: "Locating", time: "20-25 mins", isRealtime: false };
    }
  });

  const menuRef = useRef(null);
  const modalRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const { user, isAuthenticated } = useSelector((state) => state.user || {});
  const { cartItems = [] } = useSelector((state) => state.carts || {});

  const totalCartCount = cartItems.reduce(
    (acc, item) => acc + (item.quantity || 1),
    0
  );

  const wishlistCount =
    (user?.favoriteRestaurants?.length || 0) +
    (user?.favoriteFoodItems?.length || 0);

  // Real-time location auto-detect on initial load if not yet saved
  useEffect(() => {
    const saved = localStorage.getItem("fooddelivery_location");
    if (!saved) {
      handleDetectLocation(true); // silent auto-detect on first load
    }
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live location search with debouncing
  useEffect(() => {
    if (!locationSearch.trim() || locationSearch.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/v1/location/search?q=${encodeURIComponent(locationSearch.trim())}`);
        if (data && data.results) {
          setSearchResults(data.results);
        }
      } catch (err) {
        console.warn("Live search error:", err.message);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [locationSearch]);

  const logoutHandler = () => {
    dispatch(logout());
    setShowMenu(false);
    navigate("/login");
  };

  // Change location handler
  const handleSelectLocation = (loc) => {
    setLocation(loc);
    localStorage.setItem("fooddelivery_location", JSON.stringify(loc));
    setShowLocationModal(false);
    setLocationSearch("");
    setSearchResults([]);
  };

  // IP fallback detection
  const fallbackIPDetection = async (silent = false) => {
    try {
      setIsLocating(true);
      const { data } = await api.get("/v1/location/ip");
      if (data?.data) {
        const locData = {
          area: data.data.area,
          city: data.data.city,
          fullAddress: data.data.fullAddress,
          state: data.data.state,
          time: "25-30 mins",
          isRealtime: true,
        };
        handleSelectLocation(locData);
        if (!silent) {
          toast.success(`Location detected: ${locData.area}! 📍`);
        }
      }
    } catch (e) {
      const defaultLoc = {
        area: "Downtown Food Street",
        city: "Mumbai",
        state: "Maharashtra",
        fullAddress: "Downtown Food Street, Mumbai",
        time: "25-30 mins",
        isRealtime: false,
      };
      handleSelectLocation(defaultLoc);
    } finally {
      setIsLocating(false);
    }
  };

  // GPS Current Location Detection (High Accuracy Real-Time)
  const handleDetectLocation = (silent = false) => {
    if (!navigator.geolocation) {
      fallbackIPDetection(silent);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const { data } = await api.get(`/v1/location/reverse?lat=${lat}&lon=${lon}`);
          if (data && data.data) {
            const locData = {
              area: data.data.area,
              city: data.data.city,
              state: data.data.state,
              fullAddress: data.data.fullAddress,
              lat,
              lon,
              time: "20-25 mins",
              isRealtime: true,
            };
            handleSelectLocation(locData);
            if (!silent) {
              toast.success(`🎯 Real-time Location: ${locData.area}!`);
            }
          } else {
            fallbackIPDetection(silent);
          }
        } catch (err) {
          console.warn("Reverse geocode failed, using IP:", err.message);
          fallbackIPDetection(silent);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn("GPS access notice:", err.message);
        fallbackIPDetection(silent);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg sticky-top header-nav shadow-sm">
        <div className="container-fluid px-lg-5">
          {/* Brand & Location */}
          <div className="d-flex align-items-center">
            <Link to="/" className="navbar-brand d-flex align-items-center me-2 me-md-4">
              <span className="brand-logo-badge me-2">🍽️</span>
              <span className="brand-title">Feast<span className="brand-highlight">Finder</span></span>
            </Link>

            {/* Interactive Real-Time Location Chip */}
            <div
              className="d-flex align-items-center location-chip"
              onClick={() => setShowLocationModal(true)}
              title="Click to change or auto-detect real-time delivery location"
            >
              <div className="location-icon-wrapper mr-2">
                <FontAwesomeIcon icon={faLocationDot} style={{ color: "#fef08a" }} className="location-ping-icon" />
              </div>
              <div className="d-flex flex-column text-left justify-content-center" style={{ lineHeight: "1.2" }}>
                <div className="d-flex align-items-center">
                  <span className="location-text fw-bold text-white text-truncate" style={{ maxWidth: "160px", fontSize: "0.88rem" }}>
                    {location.area || "Select Location"}
                  </span>
                  <FontAwesomeIcon icon={faChevronDown} className="ml-1 text-white-50" style={{ fontSize: "0.68rem" }} />
                </div>
                <div className="d-flex align-items-center text-white-50 mt-1" style={{ fontSize: "0.72rem" }}>
                  {location.isRealtime && (
                    <span className="live-dot-pulse mr-1" title="Live GPS Active"></span>
                  )}
                  <span>{location.isRealtime ? "Live GPS • " : ""}{location.time || "25-30 mins"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="search-container mx-auto my-2 my-lg-0 col-12 col-lg-5">
            <Routes>
              <Route path="/" element={<Search />} />
              <Route path="/v1/restaurants/search/:keyword" element={<Search />} />
              <Route path="*" element={<Search />} />
            </Routes>
          </div>

          {/* Right Navigation Controls */}
          <div className="d-flex align-items-center gap-3">
            {/* Track Orders */}
            <Link to="/orders" className="nav-icon-link d-none d-sm-flex align-items-center" title="Track Order">
              <FontAwesomeIcon icon={faMotorcycle} className="nav-icon me-1" />
              <span className="nav-link-text d-none d-md-inline">Track</span>
            </Link>

            {/* Wishlist */}
            <Link to="/wishlist" className="nav-icon-link position-relative d-flex align-items-center" title="Wishlist">
              <FontAwesomeIcon icon={faHeart} className="nav-icon text-danger me-1" />
              <span className="nav-link-text d-none d-md-inline">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="badge rounded-pill bg-danger cart-badge">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart with Live Badge */}
            <Link to="/cart" className="nav-icon-link position-relative cart-pill-btn d-flex align-items-center" title="Cart">
              <FontAwesomeIcon icon={faBagShopping} className="nav-icon me-2" />
              <span className="fw-bold d-none d-sm-inline">Cart</span>
              {totalCartCount > 0 && (
                <span className="badge rounded-pill bg-success text-white cart-badge ms-1 fw-bold">
                  {totalCartCount}
                </span>
              )}
            </Link>

            {/* Real-time Notifications Bell */}
            <NotificationBell />

            {/* User Account / Profile */}
            {isAuthenticated ? (
              <div className="position-relative" ref={menuRef}>
                <div
                  className="d-flex align-items-center gap-2 profile-pill-trigger p-1 rounded-pill"
                  onClick={() => setShowMenu(!showMenu)}
                  style={{ cursor: "pointer" }}
                  title="My Account"
                >
                  <img
                    src={user?.avatar?.url || "/images/images.png"}
                    alt="Profile"
                    className="profile-avatar shadow-sm"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/images.png";
                    }}
                  />
                  <span className="d-none d-xl-inline fw-semibold text-white pe-2" style={{ fontSize: "0.9rem" }}>
                    {user?.name?.split(" ")[0] || "Account"}
                  </span>
                </div>

                {/* Profile Dropdown - Fixed Right Alignment */}
                {showMenu && (
                  <div
                    className="dropdown-menu-custom shadow-lg p-3"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: "0px",
                      left: "auto",
                      minWidth: "260px",
                      maxWidth: "290px",
                      zIndex: 1060,
                    }}
                  >
                    <div className="text-center pb-2 border-bottom">
                      <img
                        src={user?.avatar?.url || "/images/images.png"}
                        width="55"
                        height="55"
                        className="rounded-circle mb-2 border border-2 border-success"
                        style={{ objectFit: "cover" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/images/images.png";
                        }}
                      />
                      <h6 className="mb-0 fw-bold text-dark">{user?.name}</h6>
                      <small className="text-muted text-break">{user?.email}</small>
                    </div>

                    <div className="pt-2">
                      <Link to="/profile" className="dropdown-item-custom" onClick={() => setShowMenu(false)}>
                        <FontAwesomeIcon icon={faUser} className="me-2 text-primary" /> My Profile
                      </Link>
                      <Link to="/orders" className="dropdown-item-custom" onClick={() => setShowMenu(false)}>
                        <FontAwesomeIcon icon={faBoxOpen} className="me-2 text-success" /> My Orders
                      </Link>
                      <Link to="/wishlist" className="dropdown-item-custom" onClick={() => setShowMenu(false)}>
                        <FontAwesomeIcon icon={faHeart} className="me-2 text-danger" /> My Wishlist
                      </Link>
                      {(user?.role === "restaurant_owner" || user?.role === "owner" || user?.role === "admin") && (
                        <Link to="/owner/dashboard" className="dropdown-item-custom fw-bold text-dark" onClick={() => setShowMenu(false)}>
                          <FontAwesomeIcon icon={faStore} className="me-2 text-warning" /> Restaurant Owner Panel
                        </Link>
                      )}
                      {(user?.role === "delivery_partner" || user?.role === "admin") && (
                        <Link to="/delivery/dashboard" className="dropdown-item-custom fw-bold text-dark" onClick={() => setShowMenu(false)}>
                          <FontAwesomeIcon icon={faMotorcycle} className="me-2 text-warning" /> Delivery Partner Panel
                        </Link>
                      )}
                      {user && user?.role !== "delivery_partner" && user?.role !== "admin" && (
                        <Link to="/delivery/dashboard" className="dropdown-item-custom text-muted small" onClick={() => setShowMenu(false)}>
                          <FontAwesomeIcon icon={faMotorcycle} className="me-2 text-secondary" /> Become Delivery Partner
                        </Link>
                      )}
                      {user?.role === "admin" && (
                        <Link to="/admin/dashboard" className="dropdown-item-custom" onClick={() => setShowMenu(false)}>
                          <FontAwesomeIcon icon={faStore} className="me-2 text-primary" /> Admin Portal
                        </Link>
                      )}
                      <hr className="my-2" />
                      <button className="btn btn-outline-danger btn-sm w-100 rounded-pill" onClick={logoutHandler}>
                        <FontAwesomeIcon icon={faRightFromBracket} className="me-1" /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-login-pill">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* REAL-TIME LOCATION SELECTOR MODAL (ZOMATO / SWIGGY STYLE) */}
      {showLocationModal && (
        <div
          className="location-modal-backdrop d-flex align-items-center justify-content-center"
          onClick={() => setShowLocationModal(false)}
        >
          <div
            className="location-modal-card bg-white rounded-4 shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-3">
              <div>
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <FontAwesomeIcon icon={faGlobe} className="text-success" />
                  Real-time Delivery Location
                </h5>
                <small className="text-muted">Live GPS detection & nationwide address search</small>
              </div>
              <button
                type="button"
                className="btn-close-custom"
                onClick={() => setShowLocationModal(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* HIGH-ACCURACY GPS BUTTON */}
            <button
              className="btn btn-success w-100 py-2 rounded-pill fw-bold mb-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
              onClick={() => handleDetectLocation(false)}
              disabled={isLocating}
            >
              <FontAwesomeIcon
                icon={isLocating ? faSpinner : faCrosshairs}
                className={isLocating ? "fa-spin" : ""}
              />
              {isLocating ? "Detecting Live Real-time Location..." : "🎯 Detect My Real-time Location (GPS)"}
            </button>

            {/* LIVE ADDRESS SEARCH INPUT (ANY CITY / AREA IN INDIA) */}
            <div className="input-group mb-3 border rounded-pill px-3 py-1 bg-light">
              <span className="input-group-text bg-transparent border-0 text-muted">
                <FontAwesomeIcon icon={isSearching ? faSpinner : faSearch} className={isSearching ? "fa-spin" : ""} />
              </span>
              <input
                type="text"
                className="form-control bg-transparent border-0 shadow-none"
                placeholder="Search any area, city or landmark in India..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                autoFocus
              />
              {locationSearch && (
                <button
                  className="btn bg-transparent border-0 text-muted"
                  onClick={() => {
                    setLocationSearch("");
                    setSearchResults([]);
                  }}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>

            {/* LIVE SEARCH RESULTS (FROM REAL-TIME OPENSTREETMAP API) */}
            {locationSearch.trim().length >= 2 && (
              <div className="search-results-section mb-3">
                <p className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                  Live Search Results ({searchResults.length})
                </p>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {isSearching ? (
                    <div className="text-center py-3 text-muted">
                      <FontAwesomeIcon icon={faSpinner} className="fa-spin me-2" />
                      Searching nationwide locations...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((res, idx) => (
                      <div
                        key={idx}
                        className="location-item d-flex align-items-center p-2 rounded-3 mb-1"
                        onClick={() => {
                          const newLoc = {
                            area: res.area || res.city,
                            city: res.city,
                            state: res.state,
                            fullAddress: res.fullAddress,
                            time: "25-30 mins",
                            isRealtime: true,
                            lat: res.lat,
                            lon: res.lon,
                          };
                          handleSelectLocation(newLoc);
                          toast.success(`Location set: ${newLoc.area}! 📍`);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <FontAwesomeIcon icon={faMapPin} className="text-success me-3 fs-5" />
                        <div className="text-truncate">
                          <div className="fw-semibold text-dark text-truncate" style={{ fontSize: "0.95rem" }}>
                            {res.area}
                          </div>
                          <small className="text-muted text-truncate d-block" style={{ fontSize: "0.78rem" }}>
                            {res.fullAddress}
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted text-center py-2 mb-0">No live locations found for "{locationSearch}"</p>
                  )}
                </div>
              </div>
            )}

            {/* MAJOR METROS & QUICK PICKS */}
            {(!locationSearch || locationSearch.trim().length < 2) && (
              <div className="location-list-container mb-3" style={{ maxHeight: "220px", overflowY: "auto" }}>
                <p className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                  Popular Cities & Hubs
                </p>
                {METRO_CITIES.map((loc, idx) => {
                  const isSelected = location.area === loc.area;
                  return (
                    <div
                      key={idx}
                      className={`location-item d-flex justify-content-between align-items-center p-2 rounded-3 mb-1 ${
                        isSelected ? "location-item-active" : ""
                      }`}
                      onClick={() => handleSelectLocation({ ...loc, isRealtime: true })}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon
                          icon={faMapPin}
                          className={`me-3 ${isSelected ? "text-success" : "text-muted"}`}
                        />
                        <div>
                          <div className={`fw-semibold ${isSelected ? "text-success" : "text-dark"}`} style={{ fontSize: "0.95rem" }}>
                            {loc.area}
                          </div>
                          <small className="text-muted">{loc.city}, {loc.state} • Est. {loc.time}</small>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="badge bg-success rounded-pill px-2 py-1">
                          <FontAwesomeIcon icon={faCheck} className="me-1" /> Selected
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Currently Active Location Box */}
            <div className="p-2 bg-light rounded-3 d-flex align-items-center justify-content-between border">
              <div className="d-flex align-items-center">
                <span className="fs-5 me-2">📍</span>
                <div>
                  <small className="text-muted d-block" style={{ fontSize: "0.72rem" }}>Current Active Location</small>
                  <strong className="text-dark" style={{ fontSize: "0.85rem" }}>{location.area}</strong>
                </div>
              </div>
              <span className="badge bg-success text-white rounded-pill px-2 py-1">
                Active
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
