import React, { useEffect, useRef } from "react";

/**
 * Reusable LiveTrackingMap using Leaflet & OpenStreetMap
 * Displays:
 * 1. Restaurant marker 🏪
 * 2. Customer Delivery destination 📍
 * 3. Moving Delivery Partner marker with heading & pulse glow 🛵
 * 4. Polyline route connecting them
 */
const LiveTrackingMap = ({
  restaurant,
  destination,
  partnerLocation,
  orderStatus,
  height = "380px",
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const partnerMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  // Default coordinate center (Pune: 18.5204, 73.8567)
  const defaultLat = 18.5204;
  const defaultLon = 73.8567;

  // Extract restaurant coords
  const restLat =
    restaurant?.location?.coordinates?.[1] ||
    restaurant?.coordinates?.[1] ||
    18.5314;
  const restLon =
    restaurant?.location?.coordinates?.[0] ||
    restaurant?.coordinates?.[0] ||
    73.8446;

  // Extract customer coords (offset slightly from restaurant if not provided)
  const destLat = destination?.lat || 18.5158;
  const destLon = destination?.lon || 73.8682;

  // Partner coords
  const driverLat = partnerLocation?.latitude || (restLat + destLat) / 2;
  const driverLon = partnerLocation?.longitude || (restLon + destLon) / 2;

  useEffect(() => {
    const L = window.L;
    if (!L || !mapContainerRef.current) return;

    // Prevent multiple initializations on the same container
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [driverLat, driverLon],
        zoom: 14,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Add OpenStreetMap base tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // 1. Restaurant Icon & Marker
      const restIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #e53e3e;font-size:18px;">🏪</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const restMarker = L.marker([restLat, restLon], { icon: restIcon }).addTo(map);
      restMarker.bindPopup(`<b>${restaurant?.name || "Restaurant"}</b><br/>${restaurant?.address || "Pickup Point"}`);

      // 2. Customer Destination Icon & Marker
      const destIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #38a169;font-size:18px;">📍</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const destMarker = L.marker([destLat, destLon], { icon: destIcon }).addTo(map);
      destMarker.bindPopup(`<b>Delivery Destination</b><br/>${destination?.address || "Customer Location"}`);

      // 3. Driver Partner Icon & Marker
      const driverIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:#ffb300;border-radius:50%;box-shadow:0 0 14px rgba(255,179,0,0.9);border:3px solid #111;font-size:22px;">🛵</div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      const driverMarker = L.marker([driverLat, driverLon], { icon: driverIcon }).addTo(map);
      driverMarker.bindPopup(
        `<b>Delivery Executive</b><br/>Status: ${orderStatus || "En route"}<br/>Last Updated: ${
          partnerLocation?.updatedAt
            ? new Date(partnerLocation.updatedAt).toLocaleTimeString()
            : "Live"
        }`
      );
      partnerMarkerRef.current = driverMarker;

      // 4. Draw Route line connecting Restaurant -> Driver -> Destination
      const routePoints = [
        [restLat, restLon],
        [driverLat, driverLon],
        [destLat, destLon],
      ];
      const polyline = L.polyline(routePoints, {
        color: "#f59e0b",
        weight: 4,
        opacity: 0.8,
        dashArray: "8, 8",
      }).addTo(map);
      routeLineRef.current = polyline;

      // Fit map bounds to encompass all points
      const group = new L.featureGroup([restMarker, destMarker, driverMarker]);
      map.fitBounds(group.getBounds().pad(0.18));
    } catch (err) {
      console.error("LiveTrackingMap initialization error:", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [restaurant?.name, destination?.address]);

  // Smooth position update when partnerLocation changes
  useEffect(() => {
    const L = window.L;
    if (!L || !partnerLocation || !mapInstanceRef.current || !partnerMarkerRef.current) {
      return;
    }

    const { latitude, longitude, heading, speed, distanceKm, updatedAt } = partnerLocation;
    if (!latitude || !longitude) return;

    partnerMarkerRef.current.setLatLng([latitude, longitude]);

    if (heading !== undefined) {
      const driverIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#ffb300;border-radius:50%;box-shadow:0 0 16px rgba(255,179,0,0.95);border:3px solid #111;font-size:24px;transform:rotate(${heading || 0}deg);transition:transform 0.4s ease;">🛵</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      partnerMarkerRef.current.setIcon(driverIcon);
    }

    partnerMarkerRef.current.setPopupContent(
      `<b>Delivery Executive (Rahul)</b><br/>Status: ${orderStatus || "En route"}<br/>${speed ? `Speed: ${speed} km/h<br/>` : ""}${distanceKm ? `Distance: ${distanceKm} km away<br/>` : ""}Last Updated: ${
        updatedAt ? new Date(updatedAt).toLocaleTimeString() : "Just now"
      }`
    );

    // Update polyline route
    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs([
        [restLat, restLon],
        [latitude, longitude],
        [destLat, destLon],
      ]);
    }
  }, [partnerLocation?.latitude, partnerLocation?.longitude, partnerLocation?.heading, partnerLocation?.speed, partnerLocation?.distanceKm, partnerLocation?.updatedAt, orderStatus]);

  return (
    <div className="position-relative w-100 rounded-4 overflow-hidden shadow-sm border">
      {/* Live Status Overlay Header */}
      <div
        className="position-absolute top-0 start-0 end-0 p-2 d-flex align-items-center justify-content-between px-3"
        style={{
          zIndex: 1000,
          background: "rgba(17, 24, 39, 0.85)",
          backdropFilter: "blur(6px)",
          color: "#fff",
        }}
      >
        <div className="d-flex align-items-center gap-2 small flex-wrap">
          <span className="pulse-indicator bg-success"></span>
          <strong className="text-warning">Live GPS Tracking</strong>
          <span className="badge bg-secondary rounded-pill">
            {orderStatus || "In Progress"}
          </span>
          {partnerLocation?.speed ? (
            <span className="badge bg-warning text-dark rounded-pill fw-bold">
              ⚡ {partnerLocation.speed} km/h
            </span>
          ) : null}
          {partnerLocation?.distanceKm ? (
            <span className="badge bg-info text-dark rounded-pill fw-bold">
              📍 {partnerLocation.distanceKm} km away
            </span>
          ) : null}
        </div>
        <div className="small text-white-50">
          {partnerLocation?.updatedAt
            ? `Updated: ${new Date(partnerLocation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : "Satellite Sync Active"}
        </div>
      </div>

      {/* Leaflet Map Div */}
      <div
        ref={mapContainerRef}
        style={{ height, width: "100%", background: "#f8fafc" }}
      />
    </div>
  );
};

export default LiveTrackingMap;

