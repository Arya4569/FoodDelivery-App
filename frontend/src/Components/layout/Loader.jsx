import React from "react";

const Loader = ({ count = 8 }) => {
  return (
    <div className="row mt-2 g-4 skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="col-12 col-sm-6 col-lg-4 col-xl-3 my-3">
          <div className="card h-100 skeleton-card shadow-sm border-0 position-relative">
            {/* Shimmer Image Box */}
            <div className="skeleton-img shimmer"></div>
            {/* Shimmer Card Body */}
            <div className="card-body p-3 d-flex flex-column justify-content-between">
              <div>
                <div className="skeleton-line shimmer mb-2" style={{ width: "75%", height: "18px" }}></div>
                <div className="skeleton-line shimmer mb-2" style={{ width: "90%", height: "13px" }}></div>
                <div className="skeleton-line shimmer mb-3" style={{ width: "55%", height: "12px" }}></div>
              </div>
              <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                <div className="skeleton-line shimmer" style={{ width: "38%", height: "20px", borderRadius: "12px" }}></div>
                <div className="skeleton-line shimmer" style={{ width: "35%", height: "14px" }}></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Loader;
