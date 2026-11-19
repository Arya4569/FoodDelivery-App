import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  createOrder,
  getOrderDetails,
  myOrders,
  updateOrderStatus,
} from "../redux/actions/orderActions";
import { clearErrors } from "../redux/slices/orderSlice";
import { toast } from "react-toastify";
import axios from "axios";
import { useSocket } from "../context/SocketContext";
import LiveTrackingMap from "../Components/DeliveryPartner/LiveTrackingMap";

const ORDER_STAGES = [
  {
    key: "Order Confirmed",
    title: "Order Confirmed",
    desc: "Your order has been received and confirmed by the restaurant.",
    icon: "📝",
  },
  {
    key: "Preparing",
    title: "Preparing",
    desc: "Chef is preparing your delicious meal with fresh ingredients.",
    icon: "👨‍🍳",
  },
  {
    key: "Picked Up",
    title: "Picked Up",
    desc: "Delivery partner has picked up your order from the restaurant.",
    icon: "🛍️",
  },
  {
    key: "Out for Delivery",
    title: "Out for Delivery",
    desc: "Your order is on the way! Delivery executive is navigating to you.",
    icon: "🚚",
  },
  {
    key: "Delivered",
    title: "Delivered",
    desc: "Order delivered! Enjoy your fresh and hot meal.",
    icon: "🎉",
  },
];

const OrderSuccess = () => {
  const location = useLocation();
  const params = useParams();
  const dispatch = useDispatch();

  const hasCalled = useRef(false);
  const { error, order, orders, loading } = useSelector((state) => state.order);

  const searchParams = new URLSearchParams(location.search);
  const session_id = searchParams.get("session_id");
  const orderId = params.id;

  const { socket, isConnected } = useSocket();
  const [liveOrderOverride, setLiveOrderOverride] = useState(null);
  const [livePartnerLocation, setLivePartnerLocation] = useState(null);

  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [timeLeftMinutes, setTimeLeftMinutes] = useState(28);
  const [showDemo, setShowDemo] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [showManualControls, setShowManualControls] = useState(false);
  const [waypointIndex, setWaypointIndex] = useState(0);

  const WAYPOINTS = useRef([
    { lat: 18.5314, lon: 73.8446 },
    { lat: 18.5298, lon: 73.8471 },
    { lat: 18.5281, lon: 73.8498 },
    { lat: 18.5262, lon: 73.8527 },
    { lat: 18.5244, lon: 73.8559 },
    { lat: 18.5225, lon: 73.8588 },
    { lat: 18.5208, lon: 73.8617 },
    { lat: 18.5191, lon: 73.8643 },
    { lat: 18.5174, lon: 73.8665 },
    { lat: 18.5158, lon: 73.8682 },
  ]).current;

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  const demoOrder = {
    _id: "6a6058ab91c2f",
    orderStatus: "Preparing",
    paymentInfo: { status: "paid" },
    restaurant: { name: "Pizza Palace & Gourmet Kitchen" },
    deliveryInfo: {
      address: "Flat 402, Sunshine Apartments, MG Road",
      city: "Mumbai",
      postalCode: "400001",
      phoneNo: "+91 98765 12345",
    },
    orderItems: [
      { name: "Cheese Burst Pizza", quantity: 2, price: 350, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591" },
      { name: "Cold Coffee", quantity: 1, price: 120, image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c" },
    ],
    itemsPrice: 820,
    deliveryCharge: 55,
    taxPrice: 40,
    finalTotal: 915,
    deliveryPartner: {
      name: "Rahul Sharma",
      phoneNo: "+91 98765 43210",
      vehicleNumber: "MH 12 AB 4567 (Electric Scooter)",
      rating: 4.9,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    },
  };

  // Initial load: create order if session_id present, else fetch order details or myOrders
  useEffect(() => {
    if (session_id && !hasCalled.current) {
      hasCalled.current = true;
      let deliveryInfo = null;
      try {
        const saved = sessionStorage.getItem("pending_delivery_info");
        if (saved) deliveryInfo = JSON.parse(saved);
      } catch (e) {}
      dispatch(createOrder(session_id, deliveryInfo));
    } else if (orderId) {
      dispatch(getOrderDetails(orderId));
    } else {
      dispatch(myOrders());
    }
  }, [dispatch, session_id, orderId]);

  useEffect(() => {
    if (session_id && order) {
      toast.success("Order placed successfully! 🎉", {
        position: "bottom-right",
      });
    }

    if (error) {
      toast.error(error, { position: "bottom-right" });
      dispatch(clearErrors());
    }
  }, [order, error, dispatch, session_id]);

  // Handle active order logic (real-time override takes precedence)
  const currentOrder =
    liveOrderOverride ||
    order ||
    (orders && orders.length > 0 ? orders[0] : showDemo ? demoOrder : null);

  useEffect(() => {
    if (currentOrder && currentOrder.orderStatus) {
      const idx = ORDER_STAGES.findIndex(
        (s) => s.key.toLowerCase() === currentOrder.orderStatus.toLowerCase()
      );
      if (idx !== -1) {
        setActiveStageIndex(idx);
      }
    }
  }, [currentOrder]);

  // Real-time Socket.IO listeners for live tracking
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleOrderUpdate = (payload) => {
      const incomingId = payload?.orderId || payload?.order?._id;
      const targetId = currentOrder?._id;

      if (incomingId && targetId && incomingId.toString() === targetId.toString()) {
        setIsAutoPlaying(false); // Live socket update from backend overrides simulation
        const newStatus = payload.orderStatus || payload.order?.orderStatus;
        if (newStatus) {
          setLiveOrderOverride((prev) => ({
            ...(prev || currentOrder),
            orderStatus: newStatus,
            cancelReason: payload.reason || payload.order?.cancelReason || prev?.cancelReason,
            ...(payload.order || {}),
          }));

          const idx = ORDER_STAGES.findIndex(
            (s) => s.key.toLowerCase() === newStatus.toLowerCase()
          );
          if (idx !== -1) {
            setActiveStageIndex(idx);
            playChime();
          }

          toast.info(`🔔 Live Order Update: "${newStatus}"!`, {
            position: "top-right",
            autoClose: 5000,
          });
        }
      }
    };

    const handleLocationUpdate = (payload) => {
      const incomingId = payload?.orderId;
      const targetId = currentOrder?._id;
      if (incomingId && targetId && incomingId.toString() === targetId.toString()) {
        setIsAutoPlaying(false); // Live GPS update overrides simulation
        setLivePartnerLocation({
          latitude: payload.latitude,
          longitude: payload.longitude,
          heading: payload.heading || 0,
          speed: payload.speed || 0,
          updatedAt: payload.timestamp || new Date(),
        });
      }
    };

    const handleDeliveryStopped = (payload) => {
      const incomingId = payload?.orderId;
      const targetId = currentOrder?._id;
      if (incomingId && targetId && incomingId.toString() === targetId.toString()) {
        setLivePartnerLocation(null);
      }
    };

    socket.on("order:status_updated", handleOrderUpdate);
    socket.on("order:assigned", handleOrderUpdate);
    socket.on("order:preparing", handleOrderUpdate);
    socket.on("order:ready_for_pickup", handleOrderUpdate);
    socket.on("order:picked_up", handleOrderUpdate);
    socket.on("order:out_for_delivery", handleOrderUpdate);
    socket.on("order:delivered", handleOrderUpdate);
    socket.on("order:cancelled", handleOrderUpdate);
    socket.on("order:rejected", handleOrderUpdate);
    socket.on("delivery:location", handleLocationUpdate);
    socket.on("delivery:stopped", handleDeliveryStopped);

    return () => {
      socket.off("order:status_updated", handleOrderUpdate);
      socket.off("order:assigned", handleOrderUpdate);
      socket.off("order:preparing", handleOrderUpdate);
      socket.off("order:ready_for_pickup", handleOrderUpdate);
      socket.off("order:picked_up", handleOrderUpdate);
      socket.off("order:out_for_delivery", handleOrderUpdate);
      socket.off("order:delivered", handleOrderUpdate);
      socket.off("order:cancelled", handleOrderUpdate);
      socket.off("order:rejected", handleOrderUpdate);
      socket.off("delivery:location", handleLocationUpdate);
      socket.off("delivery:stopped", handleDeliveryStopped);
    };
  }, [socket, isConnected, currentOrder?._id]);

  // Initial load tracking data from REST
  useEffect(() => {
    const targetId = orderId || currentOrder?._id;
    if (!targetId || showDemo) return;

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return;

    axios
      .get(`/api/v1/delivery/orders/${targetId}/track`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data?.success && res.data.tracking) {
          if (res.data.tracking.partnerLocation) {
            setLivePartnerLocation(res.data.tracking.partnerLocation);
          }
          if (res.data.tracking.deliveryOtp) {
            setLiveOrderOverride((prev) => ({
              ...(prev || currentOrder),
              deliveryOtp: res.data.tracking.deliveryOtp,
            }));
          }
        }
      })
      .catch((e) => console.log("Initial tracking fetch:", e.message));
  }, [orderId, currentOrder?._id]);

  // Re-fetch latest order from REST API on socket reconnection
  const wasConnectedRef = useRef(isConnected);
  useEffect(() => {
    if (!wasConnectedRef.current && isConnected) {
      const targetId = orderId || currentOrder?._id;
      if (targetId) {
        console.log("[OrderSuccess] Reconnected! Fetching latest order from REST API...");
        dispatch(getOrderDetails(targetId));
      }
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, orderId, currentOrder?._id, dispatch]);

  // Countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftMinutes((prev) => (prev > 1 ? prev - 1 : 0));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Automatic Real-Time Progression Simulator (Swiggy / Zomato live experience)
  useEffect(() => {
    if (!isAutoPlaying) return;

    let timeoutId;

    if (activeStageIndex === 0) {
      // Order Confirmed -> Advance to Preparing after 5s
      timeoutId = setTimeout(() => {
        setActiveStageIndex(1);
        setTimeLeftMinutes(25);
        playChime();
        toast.info("👨‍🍳 Restaurant accepted order! Chef is preparing your dishes.", {
          position: "top-right",
          autoClose: 4000,
        });
      }, 5000);
    } else if (activeStageIndex === 1) {
      // Preparing -> Advance to Picked Up after 6s
      timeoutId = setTimeout(() => {
        setActiveStageIndex(2);
        setTimeLeftMinutes(18);
        playChime();
        toast.info("🛍️ Delivery Partner Rahul Sharma has picked up your food!", {
          position: "top-right",
          autoClose: 4000,
        });
      }, 6000);
    } else if (activeStageIndex === 2) {
      // Picked Up -> Advance to Out for Delivery after 5s
      timeoutId = setTimeout(() => {
        setActiveStageIndex(3);
        setTimeLeftMinutes(12);
        playChime();
        toast.info("🛵 Rahul is on the way! Live GPS navigation active.", {
          position: "top-right",
          autoClose: 4000,
        });
        setWaypointIndex(0);
      }, 5000);
    } else if (activeStageIndex === 3) {
      // Out for Delivery -> Move driver along waypoints every 1.8s
      const intervalId = setInterval(() => {
        setWaypointIndex((prev) => {
          const next = prev + 1;
          if (next >= WAYPOINTS.length) {
            clearInterval(intervalId);
            setActiveStageIndex(4); // Delivered!
            setTimeLeftMinutes(0);
            playChime();
            toast.success("🎉 Order Delivered! Enjoy your delicious meal!", {
              position: "top-right",
              autoClose: 6000,
            });
            setIsAutoPlaying(false);
            setLivePartnerLocation({
              latitude: WAYPOINTS[WAYPOINTS.length - 1].lat,
              longitude: WAYPOINTS[WAYPOINTS.length - 1].lon,
              heading: 0,
              speed: 0,
              distanceKm: 0,
              updatedAt: new Date(),
            });
            return prev;
          }

          const curr = WAYPOINTS[next];
          const prevPt = WAYPOINTS[next - 1] || curr;
          const dy = curr.lat - prevPt.lat;
          const dx = (curr.lon - prevPt.lon) * Math.cos((prevPt.lat * Math.PI) / 180);
          const heading = Math.round(((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360);
          const remainingPct = 1 - next / (WAYPOINTS.length - 1);
          const distKm = Math.max(0.1, remainingPct * 2.8).toFixed(1);
          const etaMins = Math.max(1, Math.round(remainingPct * 12));

          setTimeLeftMinutes(etaMins);
          setLivePartnerLocation({
            latitude: curr.lat,
            longitude: curr.lon,
            heading,
            speed: Math.round(28 + Math.sin(next) * 6),
            distanceKm: distKm,
            updatedAt: new Date(),
          });

          return next;
        });
      }, 1800);

      return () => clearInterval(intervalId);
    }

    return () => clearTimeout(timeoutId);
  }, [isAutoPlaying, activeStageIndex, WAYPOINTS]);

  const restartSimulation = () => {
    setActiveStageIndex(0);
    setTimeLeftMinutes(28);
    setWaypointIndex(0);
    setLivePartnerLocation(null);
    setIsAutoPlaying(true);
    toast.info("↺ Live Delivery Simulation restarted from Order Confirmed!", {
      position: "bottom-right",
    });
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying((prev) => {
      const nextState = !prev;
      toast.info(nextState ? "▶ Live Auto-Pilot Resumed" : "⏸ Live Auto-Pilot Paused", {
        position: "bottom-right",
      });
      return nextState;
    });
  };

  const handleManualStageChange = (newStatus, idx) => {
    setIsAutoPlaying(false);
    setActiveStageIndex(idx);
    if (idx === 3) {
      const mid = WAYPOINTS[Math.floor(WAYPOINTS.length / 2)];
      setLivePartnerLocation({
        latitude: mid.lat,
        longitude: mid.lon,
        heading: 45,
        speed: 32,
        distanceKm: 1.4,
        updatedAt: new Date(),
      });
    } else if (idx === 4) {
      setTimeLeftMinutes(0);
      const dest = WAYPOINTS[WAYPOINTS.length - 1];
      setLivePartnerLocation({
        latitude: dest.lat,
        longitude: dest.lon,
        heading: 0,
        speed: 0,
        distanceKm: 0,
        updatedAt: new Date(),
      });
    }

    if (currentOrder && currentOrder._id && !showDemo) {
      dispatch(updateOrderStatus(currentOrder._id, newStatus));
      toast.info(`Order status updated to "${newStatus}"`, {
        position: "bottom-right",
      });
    }
  };

  const handleStageChange = handleManualStageChange;

  const deliveryPartner = currentOrder?.deliveryPartner || {
    name: "Rahul Sharma",
    phoneNo: "+91 98765 43210",
    vehicleNumber: "MH 12 AB 4567 (Electric Scooter)",
    rating: 4.9,
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  };

  if (loading && !currentOrder) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading Order Details...</span>
        </div>
      </div>
    );
  }

  if (!currentOrder && (!orders || orders.length === 0)) {
    return (
      <div className="row justify-content-center my-5">
        <div className="col-md-8 text-center p-5 rounded-4 shadow-sm bg-white border">
          <div className="display-1 mb-3">📦</div>
          <h2 className="fw-bold mb-2">No Active Orders Found</h2>
          <p className="text-muted mb-4">
            You haven't placed any food orders yet. Explore our delicious menus and order now, or view our interactive tracking demo below!
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link to="/" className="btn btn-warning btn-lg px-4 rounded-pill fw-bold text-white shadow">
              Explore Restaurants 🍔
            </Link>
            <button
              type="button"
              className="btn btn-outline-dark btn-lg px-4 rounded-pill fw-bold shadow-sm"
              onClick={() => setShowDemo(true)}
            >
              View Order Tracking Demo 🛵
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentStage = ORDER_STAGES[activeStageIndex] || ORDER_STAGES[0];
  const progressPercent = (activeStageIndex / (ORDER_STAGES.length - 1)) * 100;

  return (
    <div className="order-tracking-wrapper container py-4">
      {/* Header Banner */}
      <div className="tracking-header-card p-4 rounded-4 shadow-sm mb-4 bg-gradient text-white position-relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e1e2f 0%, #2a2a40 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="row align-items-center">
          <div className="col-md-7">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold">
                Order #{currentOrder?._id ? currentOrder._id.substring(0, 10) : "109823"}
              </span>
              <span className="badge bg-success px-3 py-2 rounded-pill fw-bold">
                {currentOrder?.paymentInfo?.status === "paid" || session_id ? "Paid Online" : "Payment Confirmed"}
              </span>
            </div>
            <h2 className="fw-extrabold text-white mb-1">
              Tracking Your Order 🛵
            </h2>
            <p className="text-white-50 mb-0">
              Restaurant: <strong className="text-warning">{currentOrder?.restaurant?.name || "Gourmet Kitchen"}</strong>
            </p>
          </div>

          <div className="col-md-5 text-md-end mt-3 mt-md-0">
            <div
              className="eta-badge-box d-inline-block p-3 rounded-4 border border-secondary text-start"
              style={{ background: "rgba(15, 23, 42, 0.75)" }}
            >
              <div className="small text-uppercase tracking-wider text-muted fw-bold">
                Estimated Delivery
              </div>
              <div className="fs-3 fw-bold text-warning">
                {activeStageIndex === 4 ? (
                  <span className="text-success">Delivered 🎉</span>
                ) : (
                  `${timeLeftMinutes} Mins`
                )}
              </div>
              <div className="small text-white-50">
                {activeStageIndex === 4
                  ? "Delivered successfully"
                  : `Expected by ${new Date(
                      Date.now() + timeLeftMinutes * 60000
                    ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation / Rejection Banner */}
      {(currentOrder?.orderStatus === "Cancelled" || currentOrder?.orderStatus === "Rejected") && (
        <div className="alert alert-danger rounded-4 p-4 mb-4 shadow-sm border-0 d-flex align-items-center gap-3">
          <div className="fs-2">🚫</div>
          <div>
            <h5 className="fw-bold mb-1 text-danger">
              Order {currentOrder.orderStatus === "Rejected" ? "Rejected by Restaurant" : "Cancelled"}
            </h5>
            <p className="mb-0 text-dark">
              <strong>Reason:</strong> {currentOrder.cancelReason || "Order could not be fulfilled."}
            </p>
          </div>
        </div>
      )}

      {/* Live Real-Time Automation HUD */}
      <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white border border-warning-subtle">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className={`rounded-circle d-flex align-items-center justify-content-center shadow-sm ${
                isAutoPlaying ? "bg-success text-white pulse-glow" : "bg-warning text-dark"
              }`}
              style={{ width: "42px", height: "42px", fontSize: "20px" }}
            >
              {isAutoPlaying ? "📡" : "⏸️"}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold text-dark">
                  {isAutoPlaying ? "Live Real-Time Delivery Tracking Active" : "Real-Time Tracking (Paused)"}
                </span>
                <span className={`badge rounded-pill small ${isAutoPlaying ? "bg-success" : "bg-secondary"}`}>
                  {isAutoPlaying ? "● Auto-Piloting Live Delivery" : "Standby"}
                </span>
              </div>
              <small className="text-muted">
                {isAutoPlaying
                  ? "Stages and driver GPS are automatically advancing on the live map in real time"
                  : "Click 'Start Auto-Delivery' to resume automatic live progression"}
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-2 ${
                isAutoPlaying ? "btn-outline-secondary" : "btn-warning text-dark shadow-sm"
              }`}
              onClick={toggleAutoPlay}
            >
              {isAutoPlaying ? "⏸ Pause Auto-Pilot" : "▶ Start Auto-Delivery"}
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-dark rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
              onClick={restartSimulation}
            >
              ↺ Restart
            </button>

            <button
              type="button"
              className="btn btn-sm btn-light border rounded-pill px-3 fw-bold text-muted"
              onClick={() => setShowManualControls(!showManualControls)}
            >
              ⚙️ {showManualControls ? "Hide Manual Jump" : "Manual Jump"}
            </button>
          </div>
        </div>

        {/* Optional Manual Jump Controls for quick testing */}
        {showManualControls && (
          <div className="mt-3 pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
            <small className="text-muted fw-bold">Manual Stage Jump:</small>
            <div className="btn-group btn-group-sm flex-wrap gap-1">
              {ORDER_STAGES.map((stg, i) => (
                <button
                  key={stg.key}
                  type="button"
                  className={`btn rounded-pill px-3 fw-bold ${
                    i === activeStageIndex
                      ? "btn-warning text-dark shadow-sm"
                      : i < activeStageIndex
                      ? "btn-outline-success"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => handleManualStageChange(stg.key, i)}
                >
                  {stg.icon} {stg.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="row g-4">
        {/* Left Column: Progress Timeline & Driver Details */}
        <div className="col-lg-8">
          {/* Progress Timeline Card */}
          <div className="card border-0 shadow-sm rounded-4 mb-4 p-4 bg-white">
            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
              <span>Timeline Status</span>
              <span className="badge bg-warning-subtle text-warning border border-warning px-3 rounded-pill ms-auto">
                {currentStage.title}
              </span>
            </h5>

            {/* Visual Progress Bar */}
            <div className="timeline-progress-container position-relative mb-5 px-3">
              {/* Background Line */}
              <div className="timeline-line-bg position-absolute top-50 start-0 w-100 translate-middle-y" />

              {/* Active Fill Line */}
              <div
                className="timeline-line-fill position-absolute top-50 start-0 translate-middle-y"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Stage Nodes */}
              <div className="d-flex justify-content-between position-relative z-1">
                {ORDER_STAGES.map((stage, idx) => {
                  const isCompleted = idx < activeStageIndex;
                  const isActive = idx === activeStageIndex;
                  return (
                    <div
                      key={stage.key}
                      className="timeline-step text-center cursor-pointer"
                      onClick={() => handleStageChange(stage.key, idx)}
                      style={{ cursor: "pointer" }}
                    >
                      <div
                        className={`timeline-icon-circle mx-auto d-flex align-items-center justify-content-center rounded-circle shadow-sm transition-all ${
                          isCompleted
                            ? "bg-success text-white"
                            : isActive
                            ? "bg-warning text-dark border border-3 border-dark pulse-glow"
                            : "bg-light text-muted border"
                        }`}
                        style={{
                          width: "54px",
                          height: "54px",
                          fontSize: "22px",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {isCompleted ? "✓" : stage.icon}
                      </div>
                      <div
                        className={`small mt-2 fw-bold ${
                          isActive
                            ? "text-warning-dark fs-6"
                            : isCompleted
                            ? "text-success"
                            : "text-muted"
                        }`}
                        style={{ maxWidth: "80px", margin: "0 auto" }}
                      >
                        {stage.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Active Stage Highlight Banner */}
            <div className="active-stage-banner p-3 rounded-4 bg-light border-start border-4 border-warning d-flex align-items-center gap-3">
              <div className="display-6">{currentStage.icon}</div>
              <div>
                <h6 className="fw-bold mb-1 text-dark">{currentStage.title}</h6>
                <p className="small text-muted mb-0">{currentStage.desc}</p>
              </div>
            </div>
          </div>

          {/* SECURE DELIVERY OTP CARD (ZOMATO / SWIGGY STYLE) */}
          {currentOrder?.deliveryOtp &&
            currentOrder.orderStatus !== "Delivered" &&
            currentOrder.orderStatus !== "Cancelled" && (
              <div
                className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-gradient border-start border-4 border-warning"
                style={{ background: "#fffdf0" }}
              >
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div>
                    <span className="badge bg-warning text-dark px-3 py-1 rounded-pill fw-bold mb-1">
                      🔑 Delivery Confirmation PIN
                    </span>
                    <h5 className="fw-bold mb-1 text-dark">
                      Share with Delivery Executive
                    </h5>
                    <p className="small text-muted mb-0">
                      Give this 4-digit code to the delivery partner upon arrival to complete delivery.
                    </p>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-4 border border-warning shadow-sm text-center">
                    <span
                      className="fs-2 fw-extrabold text-dark"
                      style={{ letterSpacing: "8px" }}
                    >
                      {currentOrder.deliveryOtp}
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* REAL-TIME GPS MAP SECTION */}
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3 px-1">
              <div>
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <span>🗺️ Real-Time GPS Tracking</span>
                  {livePartnerLocation ? (
                    <span className="badge bg-success text-white rounded-pill small">
                      ● Live Signal Active
                    </span>
                  ) : (
                    <span className="badge bg-secondary-subtle text-secondary rounded-pill small">
                      Milestone Mode
                    </span>
                  )}
                </h5>
                <small className="text-muted">
                  Live satellite updates from driver's mobile device
                </small>
              </div>

              {livePartnerLocation?.updatedAt && (
                <span className="badge bg-light text-muted border rounded-pill px-3 py-1">
                  Updated: {new Date(livePartnerLocation.updatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            <LiveTrackingMap
              restaurant={currentOrder?.restaurant}
              destination={{
                address: currentOrder?.deliveryInfo?.address,
                city: currentOrder?.deliveryInfo?.city,
                lat: 18.5158,
                lon: 73.8682,
              }}
              partnerLocation={livePartnerLocation}
              orderStatus={currentOrder?.orderStatus}
              height="340px"
            />
          </div>

          {/* Delivery Partner Information Card */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <span>🛵 Delivery Partner</span>
              <span className="badge bg-success-subtle text-success border border-success px-3 rounded-pill ms-auto">
                ⭐ {deliveryPartner.rating} Rating
              </span>
            </h5>

            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 p-3 rounded-4 bg-light">
              <div className="d-flex align-items-center gap-3">
                <img
                  src={deliveryPartner.avatar}
                  alt={deliveryPartner.name}
                  className="rounded-circle border border-2 border-warning shadow-sm"
                  style={{ width: "64px", height: "64px", objectFit: "cover" }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                  }}
                />
                <div>
                  <h6 className="fw-bold mb-0 text-dark fs-5">{deliveryPartner.name}</h6>
                  <p className="small text-muted mb-1">
                    {deliveryPartner.vehicleNumber}
                  </p>
                  <span className="badge bg-success text-white small">
                    Verified Driver
                  </span>
                </div>
              </div>

              <div className="d-flex gap-2">
                <a
                  href={`tel:${deliveryPartner.phoneNo}`}
                  className="btn btn-warning text-dark fw-bold rounded-pill px-3 d-flex align-items-center gap-2 shadow-sm"
                >
                  📞 Call Partner
                </a>
                <button
                  type="button"
                  className="btn btn-outline-dark fw-bold rounded-pill px-3 d-flex align-items-center gap-2"
                  onClick={() => toast.info(`Message sent to ${deliveryPartner.name}`)}
                >
                  💬 Message
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Details & Address */}
        <div className="col-lg-4">
          {/* Delivery Address Card */}
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              📍 Delivery Address
            </h5>
            <div className="p-3 rounded-4 bg-light border">
              <p className="fw-bold mb-1 text-dark">
                {currentOrder?.deliveryInfo?.address || "123 Green Avenue, Flat 402"}
              </p>
              <p className="small text-muted mb-1">
                {currentOrder?.deliveryInfo?.city || "Mumbai"},{" "}
                {currentOrder?.deliveryInfo?.postalCode || "400001"}
              </p>
              <p className="small text-muted mb-0">
                Phone: <strong>{currentOrder?.deliveryInfo?.phoneNo || "+91 98765 00000"}</strong>
              </p>
            </div>
          </div>

          {/* Items Summary Card */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-bold mb-3 d-flex align-items-center justify-content-between">
              <span>🛒 Order Items</span>
              <span className="badge bg-secondary rounded-pill">
                {currentOrder?.orderItems?.length || 0} Items
              </span>
            </h5>

            <div className="order-items-list mb-3" style={{ maxHeight: "260px", overflowY: "auto" }}>
              {currentOrder?.orderItems && currentOrder.orderItems.length > 0 ? (
                currentOrder.orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="d-flex align-items-center justify-content-between py-2 border-bottom"
                  >
                    <div className="d-flex align-items-center gap-2">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="rounded-3"
                        style={{ width: "42px", height: "42px", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/images/default_logo.png";
                        }}
                      />
                      <div>
                        <div className="fw-bold small text-dark">{item.name}</div>
                        <div className="text-muted small">Qty: {item.quantity}</div>
                      </div>
                    </div>
                    <div className="fw-bold text-dark">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted small text-center py-3">
                  No items listed for this order.
                </div>
              )}
            </div>

            {/* Bill Summary Breakdown */}
            <div className="p-3 rounded-4 bg-light">
              <div className="d-flex justify-content-between text-muted small mb-1">
                <span>Items Subtotal</span>
                <span>₹{(currentOrder?.itemsPrice || 0).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between text-muted small mb-1">
                <span>Delivery Charge</span>
                <span>₹{(currentOrder?.deliveryCharge || 0).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between text-muted small mb-2">
                <span>Taxes & Fees</span>
                <span>₹{(currentOrder?.taxPrice || 0).toFixed(2)}</span>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between fw-bold text-dark fs-5">
                <span>Total Amount</span>
                <span className="text-warning-dark">
                  ₹{(currentOrder?.finalTotal || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Navigation back to home */}
            <div className="mt-4 text-center">
              <Link to="/" className="btn btn-outline-warning text-dark w-100 fw-bold rounded-pill">
                ⬅ Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;