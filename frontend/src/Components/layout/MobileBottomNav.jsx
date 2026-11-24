import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faBoxOpen,
  faHeart,
  faBagShopping,
  faUser
} from "@fortawesome/free-solid-svg-icons";

const MobileBottomNav = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state) => state.user || {});
  const { cartItems = [] } = useSelector((state) => state.carts || {});

  const totalCartCount = cartItems.reduce(
    (acc, item) => acc + (item.quantity || 1),
    0
  );

  const wishlistCount =
    (user?.favoriteRestaurants?.length || 0) +
    (user?.favoriteFoodItems?.length || 0);

  const path = location.pathname;

  const isActive = (route) => {
    if (route === "/") {
      return path === "/" || path.startsWith("/v1/restaurants/search");
    }
    return path.startsWith(route);
  };

  return (
    <nav className="mobile-bottom-nav d-flex d-md-none" aria-label="Mobile Navigation">
      {/* 1. Home */}
      <Link
        to="/"
        className={`mobile-nav-item ${isActive("/") ? "active" : ""}`}
        title="Home"
      >
        <div className="mobile-nav-icon-wrapper">
          <FontAwesomeIcon icon={faHome} />
        </div>
        <span className="mobile-nav-label">Home</span>
      </Link>

      {/* 2. Orders */}
      <Link
        to="/orders"
        className={`mobile-nav-item ${isActive("/orders") || isActive("/my-orders") ? "active" : ""}`}
        title="My Orders"
      >
        <div className="mobile-nav-icon-wrapper">
          <FontAwesomeIcon icon={faBoxOpen} />
        </div>
        <span className="mobile-nav-label">Orders</span>
      </Link>

      {/* 3. Wishlist */}
      <Link
        to="/wishlist"
        className={`mobile-nav-item ${isActive("/wishlist") ? "active" : ""}`}
        title="Wishlist"
      >
        <div className="mobile-nav-icon-wrapper position-relative">
          <FontAwesomeIcon icon={faHeart} />
          {wishlistCount > 0 && (
            <span className="mobile-nav-badge badge-danger">
              {wishlistCount > 9 ? "9+" : wishlistCount}
            </span>
          )}
        </div>
        <span className="mobile-nav-label">Wishlist</span>
      </Link>

      {/* 4. Cart */}
      <Link
        to="/cart"
        className={`mobile-nav-item ${isActive("/cart") ? "active" : ""}`}
        title="Cart"
      >
        <div className="mobile-nav-icon-wrapper position-relative">
          <FontAwesomeIcon icon={faBagShopping} />
          {totalCartCount > 0 && (
            <span className="mobile-nav-badge badge-success">
              {totalCartCount > 9 ? "9+" : totalCartCount}
            </span>
          )}
        </div>
        <span className="mobile-nav-label">Cart</span>
      </Link>

      {/* 5. Account / Profile */}
      <Link
        to={isAuthenticated ? "/profile" : "/login"}
        className={`mobile-nav-item ${isActive("/profile") || isActive("/login") ? "active" : ""}`}
        title={isAuthenticated ? "Profile" : "Sign In"}
      >
        <div className="mobile-nav-icon-wrapper">
          {isAuthenticated && user?.avatar?.url ? (
            <img
              src={user.avatar.url}
              alt="Avatar"
              className="mobile-nav-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/images.png";
              }}
            />
          ) : (
            <FontAwesomeIcon icon={faUser} />
          )}
        </div>
        <span className="mobile-nav-label">
          {isAuthenticated ? "Profile" : "Sign In"}
        </span>
      </Link>
    </nav>
  );
};

export default MobileBottomNav;
