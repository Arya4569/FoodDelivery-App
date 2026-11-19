import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckDouble,
  faTrash,
  faBell,
  faTimes,
  faCircle,
  faUtensils,
  faMotorcycle,
  faCheckCircle,
  faBan,
} from "@fortawesome/free-solid-svg-icons";

const NotificationPanel = ({
  notifications,
  loading,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClose,
}) => {
  const navigate = useNavigate();

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_created":
        return <FontAwesomeIcon icon={faBell} className="text-warning" />;
      case "order_preparing":
        return <FontAwesomeIcon icon={faUtensils} className="text-info" />;
      case "order_ready":
      case "order_status":
        return <FontAwesomeIcon icon={faMotorcycle} className="text-primary" />;
      case "order_delivered":
        return <FontAwesomeIcon icon={faCheckCircle} className="text-success" />;
      case "order_cancelled":
      case "order_rejected":
        return <FontAwesomeIcon icon={faBan} className="text-danger" />;
      default:
        return <FontAwesomeIcon icon={faBell} className="text-warning" />;
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead && onMarkAsRead) {
      onMarkAsRead(notif._id);
    }

    if (notif.order) {
      const orderId = typeof notif.order === "object" ? notif.order._id : notif.order;
      onClose();
      navigate(`/order/${orderId}`);
    }
  };

  return (
    <div className="notification-panel-dropdown">
      {/* Panel Header */}
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom bg-light">
        <div className="d-flex align-items-center gap-2">
          <h6 className="fw-bold mb-0 text-dark">Notifications</h6>
          {unreadCount > 0 && (
            <span className="badge bg-danger rounded-pill" style={{ fontSize: "10px" }}>
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          {unreadCount > 0 && (
            <button
              className="btn btn-sm btn-link text-decoration-none text-muted p-0 small"
              onClick={onMarkAllAsRead}
              title="Mark all as read"
              style={{ fontSize: "12px" }}
            >
              <FontAwesomeIcon icon={faCheckDouble} className="me-1" /> Mark all read
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary border-0 rounded-circle p-1"
            onClick={onClose}
            style={{ width: "24px", height: "24px", lineHeight: "1" }}
          >
            <FontAwesomeIcon icon={faTimes} size="xs" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ maxHeight: "360px", overflowY: "auto" }}>
        {loading ? (
          <div className="text-center py-4 text-muted small">
            <div className="spinner-border spinner-border-sm text-warning me-2" role="status" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FontAwesomeIcon icon={faBell} className="fs-2 text-secondary mb-2" />
            <p className="small mb-0">No notifications yet.</p>
            <small className="text-muted" style={{ fontSize: "11px" }}>
              Real-time updates about your orders will appear here.
            </small>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              className={`notification-item ${!notif.isRead ? "unread" : ""}`}
              onClick={() => handleNotificationClick(notif)}
            >
              <div className="d-flex align-items-start justify-content-between gap-2">
                <div className="d-flex align-items-start gap-2.5">
                  <div className="mt-1 fs-6">{getNotificationIcon(notif.type)}</div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h6
                        className={`mb-0 ${!notif.isRead ? "fw-bold text-dark" : "fw-semibold text-secondary"}`}
                        style={{ fontSize: "13px" }}
                      >
                        {notif.title}
                      </h6>
                      {!notif.isRead && (
                        <FontAwesomeIcon icon={faCircle} className="text-warning" style={{ fontSize: "6px" }} />
                      )}
                    </div>
                    <p className="small text-muted mb-1 mt-0.5" style={{ fontSize: "12px", lineHeight: "1.3" }}>
                      {notif.message}
                    </p>
                    <small className="text-secondary" style={{ fontSize: "10px" }}>
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {new Date(notif.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted p-1 border-0"
                  style={{ fontSize: "11px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDeleteNotification) onDeleteNotification(notif._id);
                  }}
                  title="Delete notification"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;

