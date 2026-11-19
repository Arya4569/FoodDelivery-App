import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useSocket } from "../../context/SocketContext";
import "./deliveryPartner.css";

import AvailableOrders from "./AvailableOrders";
import MyDeliveries from "./MyDeliveries";
import Earnings from "./Earnings";

const DeliveryDashboard = () => {
  const { user } = useSelector((state) => state.user || {});
  const { socket, isConnected } = useSocket();

  const [partnerProfile, setPartnerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState("deliveries"); // 'deliveries', 'available', 'earnings'

  // Partner Registration Form State (if not registered)
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regPhone, setRegPhone] = useState(user?.phoneNumber || "");
  const [regVehicleType, setRegVehicleType] = useState("Bike / Motorcycle");
  const [regVehicleNumber, setRegVehicleNumber] = useState("");
  const [regLicense, setRegLicense] = useState("");
  const [submittingReg, setSubmittingReg] = useState(false);

  // Toggling online/offline
  const [togglingOnline, setTogglingOnline] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) return;

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const res = await axios.get("/api/v1/delivery/profile/me", config);
      if (res.data?.success) {
        setPartnerProfile(res.data.deliveryPartner);
        setShowRegisterForm(false);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // Not registered as a delivery partner yet
        setShowRegisterForm(true);
      } else {
        console.error("Error fetching partner profile:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?._id]);

  // Handle Online / Offline Switch
  const handleToggleOnline = async () => {
    if (!partnerProfile) return;

    if (partnerProfile.verificationStatus !== "approved") {
      toast.warn(
        `Your account status is "${partnerProfile.verificationStatus}". Only approved delivery partners can go online.`
      );
      return;
    }

    try {
      setTogglingOnline(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const nextStatus = !partnerProfile.isOnline;

      const res = await axios.put(
        "/api/v1/delivery/availability",
        { isOnline: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setPartnerProfile((prev) => ({
          ...prev,
          isOnline: res.data.isOnline,
          availabilityStatus: res.data.availabilityStatus,
        }));
        toast.info(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update availability status");
    } finally {
      setTogglingOnline(false);
    }
  };

  // Handle Delivery Partner Registration
  const handleRegisterPartner = async (e) => {
    e.preventDefault();
    if (!regPhone || !regVehicleNumber) {
      toast.error("Please enter phone number and vehicle number");
      return;
    }

    try {
      setSubmittingReg(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.post(
        "/api/v1/delivery/register",
        {
          phone: regPhone,
          vehicleType: regVehicleType,
          vehicleNumber: regVehicleNumber,
          drivingLicense: regLicense,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        toast.success(res.data.message);
        setPartnerProfile(res.data.deliveryPartner);
        setShowRegisterForm(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setSubmittingReg(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading Delivery Partner Dashboard...</span>
        </div>
      </div>
    );
  }

  // If user is not yet a registered delivery partner, show application form
  if (showRegisterForm) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-7 col-lg-6">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="bg-gradient p-4 text-white text-center" style={{ background: "linear-gradient(135deg, #181824 0%, #2b2b3d 100%)" }}>
                <div className="display-4 mb-2">🛵</div>
                <h3 className="fw-bold mb-1">Become a Delivery Partner</h3>
                <p className="text-white-50 mb-0 small">
                  Deliver food, earn with every trip, and track deliveries with live GPS!
                </p>
              </div>

              <form onSubmit={handleRegisterPartner} className="p-4 bg-white">
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted">Full Name</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    value={user?.name || ""}
                    disabled
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-control rounded-3"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted">Vehicle Type *</label>
                  <select
                    className="form-select rounded-3"
                    value={regVehicleType}
                    onChange={(e) => setRegVehicleType(e.target.value)}
                  >
                    <option value="Bike / Motorcycle">Bike / Motorcycle</option>
                    <option value="Electric Scooter">Electric Scooter</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Car">Car</option>
                    <option value="Van">Van</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted">Vehicle Registration Number *</label>
                  <input
                    type="text"
                    className="form-control rounded-3 text-uppercase"
                    value={regVehicleNumber}
                    onChange={(e) => setRegVehicleNumber(e.target.value)}
                    placeholder="MH 12 AB 1234"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold small text-muted">Driving License Number</label>
                  <input
                    type="text"
                    className="form-control rounded-3 text-uppercase"
                    value={regLicense}
                    onChange={(e) => setRegLicense(e.target.value)}
                    placeholder="DL-1420110012345"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-warning btn-lg w-100 rounded-pill fw-bold text-dark shadow-sm"
                  disabled={submittingReg}
                >
                  {submittingReg ? "Submitting Application..." : "Submit Application 🚀"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isApproved = partnerProfile?.verificationStatus === "approved";
  const isOnline = partnerProfile?.isOnline;

  return (
    <div className="delivery-partner-wrapper container py-4">
      {/* Driver Hero Banner */}
      <div className="driver-hero-banner p-4 rounded-4 shadow-sm mb-4 text-white position-relative overflow-hidden">
        <div className="row align-items-center">
          <div className="col-md-7">
            <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
              <span className="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold">
                🛵 Delivery Executive Panel
              </span>

              {partnerProfile?.verificationStatus === "approved" ? (
                <span className="badge bg-success px-3 py-2 rounded-pill fw-bold">
                  ✓ Verified Partner
                </span>
              ) : partnerProfile?.verificationStatus === "pending" ? (
                <span className="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold">
                  ⏳ Verification Pending
                </span>
              ) : (
                <span className="badge bg-danger px-3 py-2 rounded-pill fw-bold">
                  ⚠️ {partnerProfile?.verificationStatus}
                </span>
              )}

              {/* Socket Status Indicator */}
              <span className={`badge ${isConnected ? "bg-success-subtle text-success border border-success" : "bg-danger-subtle text-danger border border-danger"} rounded-pill px-2 py-1 small`}>
                ● {isConnected ? "Socket Live" : "Reconnecting"}
              </span>
            </div>

            <div className="d-flex align-items-center gap-3 mt-3">
              <img
                src={
                  partnerProfile?.user?.avatar?.url ||
                  user?.avatar?.url ||
                  "/images/images.png"
                }
                alt="Partner Avatar"
                className="rounded-circle border border-2 border-warning shadow-sm"
                style={{ width: "64px", height: "64px", objectFit: "cover" }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                }}
              />
              <div>
                <h3 className="fw-extrabold text-white mb-0">
                  {partnerProfile?.user?.name || user?.name || "Delivery Partner"}
                </h3>
                <p className="text-white-50 small mb-0">
                  {partnerProfile?.vehicleType} • <strong>{partnerProfile?.vehicleNumber}</strong> • ⭐ {partnerProfile?.rating || 4.9} Rating
                </p>
              </div>
            </div>
          </div>

          {/* Online / Offline Toggle Card */}
          <div className="col-md-5 text-md-end mt-4 mt-md-0">
            <div
              className={`d-inline-flex flex-column align-items-md-end p-3 rounded-4 border ${
                isOnline ? "border-success bg-dark" : "border-secondary bg-dark"
              }`}
              style={{ background: "rgba(15, 23, 42, 0.85)" }}
            >
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className={`pulse-indicator ${isOnline ? "bg-success" : "bg-secondary"}`}></span>
                <span className="text-white fw-bold small text-uppercase">
                  Status: {isOnline ? "Online" : "Offline"}
                </span>
              </div>

              <button
                type="button"
                className={`btn btn-sm rounded-pill px-4 fw-bold shadow-sm ${
                  isOnline
                    ? "btn-success text-white"
                    : "btn-outline-light"
                }`}
                onClick={handleToggleOnline}
                disabled={togglingOnline || !isApproved}
              >
                {togglingOnline
                  ? "Updating..."
                  : isOnline
                  ? "✓ You are Online (Accepting Orders)"
                  : "Go Online 🛵"}
              </button>

              {!isApproved && (
                <small className="text-warning mt-2 d-block">
                  Awaiting admin verification before going online.
                </small>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verification Notice Banner if Pending */}
      {partnerProfile?.verificationStatus === "pending" && (
        <div className="alert alert-warning rounded-4 p-3 mb-4 shadow-sm border-0 d-flex align-items-center gap-3">
          <div className="fs-3">📋</div>
          <div>
            <h6 className="fw-bold mb-0">Application Under Review</h6>
            <p className="small mb-0 text-muted">
              An administrator will verify your vehicle details and activate your delivery assignments shortly.
            </p>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="d-flex align-items-center gap-2 mb-4 overflow-auto pb-2">
        <button
          className={`btn rounded-pill px-4 py-2 fw-bold ${
            activeMainTab === "deliveries"
              ? "btn-warning text-dark shadow-sm"
              : "btn-light text-muted border"
          }`}
          onClick={() => setActiveMainTab("deliveries")}
        >
          🛵 My Deliveries
        </button>
        <button
          className={`btn rounded-pill px-4 py-2 fw-bold ${
            activeMainTab === "available"
              ? "btn-warning text-dark shadow-sm"
              : "btn-light text-muted border"
          }`}
          onClick={() => setActiveMainTab("available")}
        >
          🛍️ Available Orders
        </button>
        <button
          className={`btn rounded-pill px-4 py-2 fw-bold ${
            activeMainTab === "earnings"
              ? "btn-warning text-dark shadow-sm"
              : "btn-light text-muted border"
          }`}
          onClick={() => setActiveMainTab("earnings")}
        >
          💰 Earnings & Payouts
        </button>
      </div>

      {/* Tab Panels */}
      {activeMainTab === "deliveries" && (
        <MyDeliveries onRefreshStats={fetchProfile} />
      )}
      {activeMainTab === "available" && (
        <AvailableOrders isOnline={isOnline} onRefreshProfile={fetchProfile} />
      )}
      {activeMainTab === "earnings" && <Earnings />}
    </div>
  );
};

export default DeliveryDashboard;

