import React from "react";
import { useSelector } from "react-redux";
import "./css/count.css";

const CountRestaurant = () => {
  const { count, pureVegRestaurantsCount, showVegOnly, loading, error, restaurants } =
    useSelector((state) => state.restaurants);

  const currentCount = showVegOnly
    ? pureVegRestaurantsCount
    : (restaurants ? restaurants.length : count);

  return (
    <div className="count-section my-3">
      {loading ? (
        <p className="text-muted">Loading restaurants...</p>
      ) : error ? (
        <p className="text-danger">Error: {error}</p>
      ) : (
        <div className="d-flex align-items-center justify-content-between">
          <p className="NumOfRestro mb-0">
            <span className="fw-bold fs-4">{currentCount}</span>
            <span className="Restro text-muted fs-5 ms-2">
              {showVegOnly ? "Pure Veg " : ""}
              {currentCount === 1 ? "restaurant found" : "restaurants found"}
            </span>
          </p>
        </div>
      )}
      <hr className="my-2" />
    </div>
  );
};

export default CountRestaurant;
