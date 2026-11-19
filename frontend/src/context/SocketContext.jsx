import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";

const SocketContext = createContext({
  socket: null,
  isConnected: false,
  joinRestaurant: () => {},
  leaveRestaurant: () => {},
});

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  const { user, isAuthenticated } = useSelector((state) => state.user || {});
  const token = localStorage.getItem("token");

  useEffect(() => {
    // Only connect if user is authenticated and token is available
    if (isAuthenticated && token) {
      // Connect directly to backend port 5000 in dev or origin
      const socketUrl =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "http://localhost:5000"
          : window.location.origin;

      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      socketRef.current = newSocket;

      newSocket.on("connect", () => {
        setIsConnected(true);
        console.log("[SocketContext] Connected to real-time server with socket ID:", newSocket.id);
      });

      newSocket.on("disconnect", (reason) => {
        setIsConnected(false);
        console.log("[SocketContext] Disconnected from server:", reason);
      });

      newSocket.on("connect_error", (err) => {
        setIsConnected(false);
        console.warn("[SocketContext] Connection warning:", err.message);
      });

      setSocket(newSocket);

      return () => {
        console.log("[SocketContext] Cleaning up socket connection...");
        newSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // If user logged out or no token, disconnect any existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, token, user?._id]);

  const joinRestaurant = (restaurantId) => {
    if (socketRef.current && isConnected && restaurantId) {
      socketRef.current.emit("join:restaurant", { restaurantId }, (res) => {
        if (res?.success) {
          console.log(`[SocketContext] Successfully joined room: ${res.room}`);
        } else {
          console.warn("[SocketContext] Failed to join restaurant room:", res?.message);
        }
      });
    }
  };

  const leaveRestaurant = (restaurantId) => {
    if (socketRef.current && isConnected && restaurantId) {
      socketRef.current.emit("leave:restaurant", { restaurantId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinRestaurant,
        leaveRestaurant,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};

export default SocketContext;

