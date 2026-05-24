const Hospital = require("../models/Hospital");

const findNearestHospitals = async ({ lat, lng, maxDistance = 50000, limit = 10, filter = {} }) => {
  const query = {
    isActive: true,
    "address.coordinates": {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: maxDistance,
      },
    },
    ...filter,
  };

  const hospitals = await Hospital.find(query)
    .limit(limit)
    .select("name type phone emergencyPhone address beds oxygen ambulances specialties rating")
    .lean();

  return hospitals.map((h) => {
    const [hLng, hLat] = h.address.coordinates.coordinates;
    const distance = calculateDistance(lat, lng, hLat, hLng);
    return { ...h, distance: Math.round(distance) };
  });
};

const findHospitalsWithBeds = async ({ lat, lng, maxDistance = 30000 }) => {
  return findNearestHospitals({
    lat, lng, maxDistance,
    filter: { "beds.available": { $gt: 0 } },
  });
};

const findHospitalsWithOxygen = async ({ lat, lng, maxDistance = 30000 }) => {
  return findNearestHospitals({
    lat, lng, maxDistance,
    filter: { "oxygen.available": true, "oxygen.cylindersAvailable": { $gt: 0 } },
  });
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateTravelTime = (distanceMeters, mode = "ambulance") => {
  const speeds = { ambulance: 60, car: 40, walk: 5 };
  const speedKmh = speeds[mode] || 40;
  const hours = distanceMeters / 1000 / speedKmh;
  return Math.ceil(hours * 60); // minutes
};

module.exports = { findNearestHospitals, findHospitalsWithBeds, findHospitalsWithOxygen, calculateDistance, estimateTravelTime };
