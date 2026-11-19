const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

// Helper to format clean area from Nominatim address object
function extractCleanArea(address = {}) {
  const primary =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.road ||
    address.commercial ||
    address.quarter ||
    address.village ||
    address.town;

  const city =
    address.city ||
    address.town ||
    address.city_district ||
    address.county ||
    address.state_district ||
    "Pune";

  if (primary && city && primary.toLowerCase() !== city.toLowerCase()) {
    return `${primary}, ${city}`;
  }
  return city || primary || "Pune, Maharashtra";
}

// 1. REVERSE GEOCODE: Given lat & lon, return real-world address
exports.reverseGeocode = catchAsyncErrors(async (req, res, next) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude are required",
    });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "FoodDeliveryApp-RealtimeLocator/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error HTTP ${response.status}`);
    }

    const data = await response.json();
    const address = data.address || {};
    const area = extractCleanArea(address);

    return res.status(200).json({
      success: true,
      data: {
        area,
        fullAddress: data.display_name,
        road: address.road || "",
        suburb: address.suburb || address.neighbourhood || "",
        city: address.city || address.town || address.county || "Pune",
        state: address.state || "Maharashtra",
        pincode: address.postcode || "",
        lat: Number(lat),
        lon: Number(lon),
        time: "20-25 mins",
      },
    });
  } catch (err) {
    console.error("Reverse geocoding error:", err.message);
    // Graceful fallback
    return res.status(200).json({
      success: true,
      data: {
        area: `Location (${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)})`,
        fullAddress: `Coordinates: ${lat}, ${lon}`,
        city: "Current Location",
        state: "Maharashtra",
        lat: Number(lat),
        lon: Number(lon),
        time: "25-30 mins",
      },
    });
  }
});

// 2. SEARCH LOCATIONS: Autocomplete for any city / area across India / World
exports.searchLocations = catchAsyncErrors(async (req, res, next) => {
  const { q } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(200).json({ success: true, results: [] });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q.trim()
    )}&limit=7&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "FoodDeliveryApp-RealtimeLocator/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim search error HTTP ${response.status}`);
    }

    const data = await response.json();

    const results = (data || []).map((item) => {
      const address = item.address || {};
      const area = extractCleanArea(address);
      return {
        area: item.name || area,
        city: address.city || address.town || address.state || "",
        state: address.state || "",
        fullAddress: item.display_name,
        lat: Number(item.lat),
        lon: Number(item.lon),
        time: "25-35 mins",
      };
    });

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (err) {
    console.error("Location search error:", err.message);
    return res.status(200).json({
      success: true,
      results: [],
    });
  }
});

// 3. AUTO-DETECT VIA IP (Instant fallback when GPS permission is not yet promptable)
exports.detectByIP = catchAsyncErrors(async (req, res, next) => {
  try {
    const response = await fetch("https://ipapi.co/json/", {
      headers: { "User-Agent": "FoodDeliveryApp-RealtimeLocator/1.0" },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.city) {
        return res.status(200).json({
          success: true,
          data: {
            area: `${data.city}, ${data.region || data.country_name}`,
            city: data.city,
            state: data.region || "",
            fullAddress: `${data.city}, ${data.region}, ${data.country_name}`,
            lat: data.latitude,
            lon: data.longitude,
            time: "25-30 mins",
          },
        });
      }
    }
  } catch (e) {
    console.warn("IP-based location detection skipped:", e.message);
  }

  // Default fallback
  res.status(200).json({
    success: true,
    data: {
      area: "Pune, Maharashtra",
      city: "Pune",
      state: "Maharashtra",
      fullAddress: "Pune, Maharashtra, India",
      lat: 18.5204,
      lon: 73.8567,
      time: "20-25 mins",
    },
  });
});

