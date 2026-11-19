import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { useSocket } from "../../context/SocketContext";
import NotificationPanel from "./NotificationPanel";
import "./notifications.css";

const NotificationBell = () => {
  const { isAuthenticated } = useSelector((state) => state.user || {});
  const { socket, isConnected } = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);

  // Fetch unread count on mount or auth change
  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await api.get("/v1/notifications/unread-count");
      setUnreadCount(data.count || 0);
    } catch (err) {
      // silently fail if network error
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const { data } = await api.get("/v1/notifications?limit=20");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.warn("Failed to fetch notifications:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    } else {
      setUnreadCount(0);
      setNotifications([]);
    }
  }, [isAuthenticated]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = ({ notification }) => {
      if (!notification) return;
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [notification, ...prev]);

      // Informative Toast
      toast.info(`🔔 ${notification.title}: ${notification.message}`, {
        position: "top-right",
        autoClose: 4000,
      });
    };

    const handleUnreadCount = ({ count }) => {
      setUnreadCount(count);
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:unread_count", handleUnreadCount);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:unread_count", handleUnreadCount);
    };
  }, [socket, isConnected]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/v1/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("Mark as read failed:", err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/v1/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read!");
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/v1/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      fetchUnreadCount();
      toast.success("Notification deleted");
    } catch (err) {
      toast.error("Failed to delete notification");
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="position-relative d-inline-block" ref={containerRef}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={handleToggle}
        title="Notifications"
        aria-label="Notifications"
      >
        <FontAwesomeIcon icon={faBell} className="fs-5" />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          unreadCount={unreadCount}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDeleteNotification={handleDeleteNotification}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;

