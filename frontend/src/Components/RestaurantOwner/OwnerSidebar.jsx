import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faStore,
  faUtensils,
  faShoppingBag,
  faArrowLeft,
  faRightFromBracket,
  faChevronLeft,
  faChevronRight,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

const OwnerSidebar = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  restaurants = [],
  selectedRestaurantId,
  setSelectedRestaurantId,
  pendingOrdersCount = 0,
  foodItemsCount = 0,
  onOpenAddRestaurantModal,
  onLogout,
}) => {
  return (
    <aside
      className={`owner-sidebar p-3 d-flex flex-column ${
        sidebarOpen ? "col-lg-2 col-md-3" : "col-auto"
      }`}
      style={{
        minWidth: sidebarOpen ? "250px" : "80px",
        borderRadius: "16px 0 0 16px",
      }}
    >
      {/* Top Header */}
      <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary">
        <div className="d-flex align-items-center gap-2 overflow-hidden">
          <span className="fs-3">👨‍🍳</span>
          {sidebarOpen && (
            <div>
              <h6 className="fw-bold mb-0 text-warning text-truncate">Owner Portal</h6>
              <small className="text-secondary" style={{ fontSize: "11px" }}>
                Partner Management
              </small>
            </div>
          )}
        </div>
        <button
          className="btn btn-sm btn-outline-light border-0 px-2"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <FontAwesomeIcon icon={sidebarOpen ? faChevronLeft : faChevronRight} />
        </button>
      </div>

      {/* Restaurant Selector (if multiple restaurants) */}
      {sidebarOpen && restaurants.length > 0 && (
        <div className="mb-3">
          <label className="text-secondary small fw-semibold text-uppercase" style={{ fontSize: "11px" }}>
            Active Restaurant
          </label>
          <div className="d-flex gap-1 mt-1">
            <select
              className="form-select form-select-sm bg-dark text-white border-secondary rounded-3"
              value={selectedRestaurantId || ""}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
            >
              <option value="">All Restaurants</option>
              {restaurants.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
            {onOpenAddRestaurantModal && (
              <button
                className="btn btn-sm btn-warning rounded-3"
                title="Register New Restaurant"
                onClick={onOpenAddRestaurantModal}
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="nav flex-column gap-2 flex-grow-1">
        {[
          {
            id: "overview",
            label: "Dashboard",
            icon: faChartLine,
          },
          {
            id: "restaurant",
            label: "Restaurant Info",
            icon: faStore,
            badge: restaurants.length > 0 ? restaurants.length : null,
          },
          {
            id: "menu",
            label: "Menu & Food Items",
            icon: faUtensils,
            badge: foodItemsCount > 0 ? foodItemsCount : null,
          },
          {
            id: "orders",
            label: "Orders Management",
            icon: faShoppingBag,
            badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
            badgeColor: "bg-warning text-dark",
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-link ${isActive ? "active" : ""}`}
            >
              <div className="d-flex align-items-center gap-3">
                <FontAwesomeIcon icon={tab.icon} style={{ width: "18px" }} />
                {sidebarOpen && <span>{tab.label}</span>}
              </div>
              {sidebarOpen && tab.badge && (
                <span
                  className={`badge rounded-pill ms-auto ${
                    tab.badgeColor || (isActive ? "bg-dark text-white" : "bg-secondary text-white")
                  }`}
                  style={{ fontSize: "11px" }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Navigation */}
      <div className="pt-3 border-top border-secondary d-flex flex-column gap-2 mt-auto">
        <Link
          to="/"
          className="btn btn-sm btn-outline-light rounded-pill w-100 d-flex align-items-center justify-content-center gap-2"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          {sidebarOpen && <span>Back to Customer View</span>}
        </Link>
        {onLogout && (
          <button
            className="btn btn-sm btn-danger rounded-pill w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={onLogout}
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

export default OwnerSidebar;

