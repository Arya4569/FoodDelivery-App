import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faIndianRupeeSign,
  faTrash,
  faShoppingCart,
  faHeart,
  faStore,
  faUtensils,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import {
  fetchWishlist,
  toggleFavRestaurant,
  toggleFavFoodItem,
} from "../../redux/actions/userActions";
import { addItemToCart } from "../../redux/actions/cartActions";
import Loader from "../layout/Loader";
import Message from "../Message";
import { toast } from "react-toastify";

const Wishlist = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("foodItems"); // 'foodItems' | 'restaurants'

  const { isAuthenticated, user } = useSelector((state) => state.user);
  const { wishlist } = useSelector((state) => state.user);
  const { restaurants = [], foodItems = [], loading = false, error = null } = wishlist || {};

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    dispatch(fetchWishlist());
  }, [dispatch, isAuthenticated, navigate]);

  const handleRemoveFoodItem = (id) => {
    dispatch(toggleFavFoodItem(id));
    toast.info("Item removed from Wishlist");
  };

  const handleRemoveRestaurant = (id) => {
    dispatch(toggleFavRestaurant(id));
    toast.info("Restaurant removed from Wishlist");
  };

  const handleMoveToCart = (item) => {
    const restaurantId = item.restaurant?._id || item.restaurant;
    if (!restaurantId) {
      toast.error("Restaurant information missing for this item");
      return;
    }
    dispatch(addItemToCart(item._id, restaurantId, 1));
    dispatch(toggleFavFoodItem(item._id));
    toast.success(`${item.name} moved to Cart! 🛒`);
  };

  if (loading) return <Loader />;

  const currentList = activeTab === "foodItems" ? foodItems : restaurants;
  const isEmpty = !currentList || currentList.length === 0;

  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2>
          <FontAwesomeIcon icon={faHeart} className="text-danger me-2" />
          My Wishlist
        </h2>
        <span className="badge badge-success p-2" style={{ fontSize: "1rem" }}>
          {foodItems.length + restaurants.length} Total Saved
        </span>
      </div>

      {/* Tabs */}
      <div className="wishlist-tabs-container mb-4">
        <button
          className={`wishlist-tab ${activeTab === "foodItems" ? "active" : ""}`}
          onClick={() => setActiveTab("foodItems")}
        >
          <FontAwesomeIcon icon={faUtensils} className="me-2" />
          Favourite Dishes ({foodItems.length})
        </button>
        <button
          className={`wishlist-tab ${activeTab === "restaurants" ? "active" : ""}`}
          onClick={() => setActiveTab("restaurants")}
        >
          <FontAwesomeIcon icon={faStore} className="me-2" />
          Favourite Restaurants ({restaurants.length})
        </button>
      </div>

      {error && <Message variant="danger">{error}</Message>}

      {/* Empty State */}
      {isEmpty ? (
        <div className="text-center py-5 shadow-sm rounded bg-white">
          <div style={{ fontSize: "60px" }}>
            {activeTab === "foodItems" ? "🍲" : "🏪"}
          </div>
          <h4 className="mt-3 text-muted">
            {activeTab === "foodItems"
              ? "Your favourite dishes list is empty!"
              : "No favourite restaurants added yet!"}
          </h4>
          <p className="text-secondary mb-4">
            Explore our menu and tap the heart icon to save your top picks.
          </p>
          <Link to="/" className="btn btn-success px-4 py-2 rounded-pill">
            Explore Now
          </Link>
        </div>
      ) : (
        /* Items Grid */
        <div className="row">
          {activeTab === "foodItems"
            ? foodItems.map((item) => (
                <div key={item._id} className="col-12 col-sm-6 col-md-4 col-lg-3 my-3">
                  <div className="card h-100 shadow-sm border-0 rounded-lg overflow-hidden position-relative wishlist-card">
                    <img
                      src={item.image?.[0]?.url || item.images?.[0]?.url || "/images/placeholder.png"}
                      alt={item.name}
                      className="card-img-top food-image"
                      style={{ height: "180px", objectFit: "cover" }}
                    />
                    <div className="card-body d-flex flex-column p-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <h5 className="card-title font-weight-bold mb-1">{item.name}</h5>
                        <button
                          className="btn btn-sm btn-outline-danger border-0 rounded-circle"
                          onClick={() => handleRemoveFoodItem(item._id)}
                          title="Remove from Wishlist"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>

                      {item.restaurant?.name && (
                        <small className="text-muted mb-2">
                          <FontAwesomeIcon icon={faStore} className="me-1" />
                          {item.restaurant.name}
                        </small>
                      )}

                      <p className="fooditem_des text-muted small mb-2 text-truncate">
                        {item.description}
                      </p>

                      <div className="d-flex align-items-center justify-content-between mt-auto pt-2 border-top">
                        <span className="font-weight-bold text-success h5 mb-0">
                          <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" /> {item.price}
                        </span>
                        <div className="rating-outer">
                          <div
                            className="rating-inner"
                            style={{ width: `${((item.ratings || 4.5) / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <button
                        className="btn btn-success btn-block mt-3 rounded-pill d-flex align-items-center justify-content-center gap-2"
                        onClick={() => handleMoveToCart(item)}
                      >
                        <FontAwesomeIcon icon={faShoppingCart} /> Move to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))
            : restaurants.map((rest) => (
                <div key={rest._id} className="col-12 col-md-6 my-3">
                  <div className="card h-100 shadow-sm border-0 rounded-lg p-3 d-flex flex-row align-items-center position-relative gap-3">
                    <Link to={`/restaurants/${rest._id}/menus`}>
                      <img
                        src={rest.images?.[0]?.url || "/images/placeholder.png"}
                        alt={rest.name}
                        style={{
                          width: "120px",
                          height: "110px",
                          objectFit: "cover",
                          borderRadius: "10px",
                        }}
                      />
                    </Link>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <Link
                          to={`/restaurants/${rest._id}/menus`}
                          className="text-dark text-decoration-none"
                        >
                          <h5 className="font-weight-bold mb-1">{rest.name}</h5>
                        </Link>
                        <button
                          className="btn btn-sm btn-outline-danger border-0 rounded-circle"
                          onClick={() => handleRemoveRestaurant(rest._id)}
                          title="Remove from Wishlist"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>

                      <p className="text-muted small mb-2 text-truncate" style={{ maxWidth: "250px" }}>
                        {rest.address}
                      </p>

                      <div className="d-flex align-items-center gap-2">
                        <div className="rating-outer me-2">
                          <div
                            className="rating-inner"
                            style={{ width: `${((rest.ratings || 4) / 5) * 100}%` }}
                          ></div>
                        </div>
                        <small className="text-muted">({rest.numOfReviews || 0} reviews)</small>
                      </div>

                      <Link
                        to={`/restaurants/${rest._id}/menus`}
                        className="btn btn-outline-success btn-sm mt-2 rounded-pill"
                      >
                        View Menu
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
