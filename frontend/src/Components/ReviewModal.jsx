import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faTimes, faCheckCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import api from "../utils/api";
import { toast } from "react-toastify";

const ReviewModal = ({ foodItem, onClose, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingReviews, setExistingReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const foodId = foodItem?._id || foodItem?.fooditem;
  const foodName = foodItem?.name || "Food Item";

  useEffect(() => {
    if (foodId) {
      api
        .get(`/v1/foods/item/${foodId}/reviews`)
        .then((res) => {
          setExistingReviews(res.data.reviews || []);
        })
        .catch((err) => {
          console.warn("Could not fetch reviews:", err.message);
        })
        .finally(() => {
          setLoadingReviews(false);
        });
    }
  }, [foodId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!comment.trim()) {
      toast.error("Please enter your review comments");
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error("Please select a rating between 1 and 5 stars");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/v1/foods/item/${foodId}/reviews`, {
        rating,
        comment: comment.trim(),
      });

      toast.success("Review submitted successfully! 🎉");
      if (onReviewSubmitted) {
        onReviewSubmitted(res.data.foodItem);
      }
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Failed to submit review. You can only review items you have previously ordered.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop-custom"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        className="card border-0 shadow-lg rounded-4 overflow-hidden"
        style={{
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom bg-light">
          <div>
            <h5 className="fw-bold mb-0 text-dark">Rate & Review</h5>
            <small className="text-muted">{foodName}</small>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-light rounded-circle"
            onClick={onClose}
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            {/* Interactive Star Rating */}
            <div className="text-center mb-4">
              <label className="form-label fw-bold d-block text-muted small text-uppercase">
                Your Rating
              </label>
              <div className="d-flex justify-content-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      type="button"
                      key={star}
                      className="btn p-1 border-0 bg-transparent"
                      style={{ fontSize: "1.75rem", cursor: "pointer", transition: "0.15s" }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    >
                      <FontAwesomeIcon
                        icon={faStar}
                        style={{ color: active ? "#ffc107" : "#e2e8f0" }}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="badge bg-warning text-dark mt-1 px-3 py-1 rounded-pill">
                {rating} out of 5 Stars
              </span>
            </div>

            {/* Comment Area */}
            <div className="mb-3">
              <label className="form-label fw-bold text-dark small">
                Write your review
              </label>
              <textarea
                className="form-control rounded-3"
                rows="3"
                placeholder="How was the taste, portion size, and presentation?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                required
              />
              <div className="d-flex justify-content-end text-muted small mt-1">
                {comment.length}/500 characters
              </div>
            </div>

            {/* Submit Button */}
            <div className="d-flex gap-2 justify-content-end pt-2 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill px-4"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-warning rounded-pill px-4 fw-bold shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin me-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Submit Review
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Existing Customer Reviews */}
          <div className="mt-4 pt-3 border-top">
            <h6 className="fw-bold mb-3 text-dark small text-uppercase">
              Customer Reviews ({existingReviews.length})
            </h6>
            {loadingReviews ? (
              <div className="text-center py-3 text-muted small">
                <FontAwesomeIcon icon={faSpinner} className="fa-spin me-2" />
                Loading reviews...
              </div>
            ) : existingReviews.length === 0 ? (
              <div className="text-muted small text-center py-2 bg-light rounded-3">
                No reviews yet. Be the first to review this dish!
              </div>
            ) : (
              <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                {existingReviews.slice(-5).reverse().map((r, idx) => (
                  <div key={idx} className="p-2 mb-2 bg-light rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold small text-dark">{r.name || "Customer"}</span>
                      <div>
                        {[...Array(5)].map((_, i) => (
                          <FontAwesomeIcon
                            key={i}
                            icon={faStar}
                            className={`small ${i < r.rating ? "text-warning" : "text-muted"}`}
                            style={{ fontSize: "0.75rem" }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mb-0 small text-secondary">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
