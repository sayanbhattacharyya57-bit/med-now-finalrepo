const AmbulanceRequest = require("../models/AmbulanceRequest");
const Hospital = require("../models/Hospital");
const { sendSuccess, sendError } = require("../utils/response");
const { findNearestHospitals, estimateTravelTime } = require("../services/geolocationService");
const { createNotification } = require("../services/notificationService");

let io = null;
const setSocketIO = (socketIO) => { io = socketIO; };

const requestAmbulance = async (req, res, next) => {
  try {
    const { lat, lng, address, landmark, emergencyType = "medical", description, severity = "high", contactPhone } = req.body;

    if (!lat || !lng || !address) return sendError(res, 400, "Location details are required");

    const nearbyHospitals = await findNearestHospitals({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      maxDistance: 20000,
      limit: 3,
      filter: { "ambulances.available": { $gt: 0 } },
    });

    const nearest = nearbyHospitals[0];

    const request = await AmbulanceRequest.create({
      patient: req.user._id,
      hospital: nearest?._id,
      requestedBy: {
        name: req.user.name,
        phone: contactPhone || req.user.phone,
        userId: req.user._id,
      },
      pickup: {
        address,
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
        landmark,
      },
      destination: nearest
        ? {
            hospitalId: nearest._id,
            address: `${nearest.name}, ${nearest.address?.city}`,
          }
        : undefined,
      emergency: { type: emergencyType, description, severity },
      timeline: [{ status: "requested", timestamp: new Date(), note: "Ambulance request initiated" }],
    });

    await request.populate("hospital", "name phone emergencyPhone address");

    // Real-time notification to hospital
    if (io && nearest) {
      io.to(`hospital:${nearest._id}`).emit("ambulance:request", {
        requestId: request._id,
        patient: { name: req.user.name, phone: req.user.phone },
        pickup: request.pickup,
        emergency: request.emergency,
        estimatedDistance: nearest.distance,
      });
    }

    // Notify hospital admins
    if (nearest) {
      const hospital = await Hospital.findById(nearest._id).select("admins");
      await Promise.allSettled(
        (hospital?.admins || []).map((adminId) =>
          createNotification({
            recipient: adminId,
            type: "general",
            title: "🚑 Ambulance Request",
            message: `Ambulance requested by ${req.user.name} at ${address}. Severity: ${severity}`,
            data: { requestId: request._id },
            priority: "urgent",
          })
        )
      );
    }

    return sendSuccess(res, 201, "Ambulance requested successfully", {
      requestId: request._id,
      status: request.status,
      nearbyHospitals: nearbyHospitals.map((h) => ({
        name: h.name,
        phone: h.phone,
        emergencyPhone: h.emergencyPhone,
        distance: h.distance,
        estimatedArrival: estimateTravelTime(h.distance, "ambulance"),
        ambulancesAvailable: h.ambulances?.available,
      })),
      emergencyNumbers: ["108", "112", "102"],
    });
  } catch (err) {
    next(err);
  }
};

const getMyRequests = async (req, res, next) => {
  try {
    const requests = await AmbulanceRequest.find({ patient: req.user._id })
      .populate("hospital", "name phone address")
      .sort({ createdAt: -1 })
      .limit(20);
    return sendSuccess(res, 200, "Requests retrieved", { requests });
  } catch (err) {
    next(err);
  }
};

const getRequestById = async (req, res, next) => {
  try {
    const request = await AmbulanceRequest.findById(req.params.id)
      .populate("patient", "name phone patientProfile.bloodGroup")
      .populate("hospital", "name phone emergencyPhone address");
    if (!request) return sendError(res, 404, "Request not found");
    return sendSuccess(res, 200, "Request retrieved", { request });
  } catch (err) {
    next(err);
  }
};

const updateRequestStatus = async (req, res, next) => {
  try {
    const { status, vehicleNumber, driverName, driverPhone, note } = req.body;
    const request = await AmbulanceRequest.findById(req.params.id);
    if (!request) return sendError(res, 404, "Request not found");

    request.status = status;
    request.timeline.push({ status, timestamp: new Date(), note });

    if (vehicleNumber) request.ambulance.vehicleNumber = vehicleNumber;
    if (driverName) request.ambulance.driverName = driverName;
    if (driverPhone) request.ambulance.driverPhone = driverPhone;

    await request.save();

    // Real-time update to patient
    if (io) {
      io.to(`user:${request.patient}`).emit("ambulance:statusUpdate", {
        requestId: request._id,
        status,
        ambulance: request.ambulance,
        note,
        timestamp: new Date(),
      });
    }

    await createNotification({
      recipient: request.patient,
      type: "ambulance_update",
      title: "Ambulance Update",
      message: `Your ambulance request status: ${status.replace("_", " ").toUpperCase()}${note ? `. ${note}` : ""}`,
      data: { requestId: request._id, status },
      priority: "urgent",
    });

    return sendSuccess(res, 200, "Status updated", { request });
  } catch (err) {
    next(err);
  }
};

const updateAmbulanceLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const request = await AmbulanceRequest.findByIdAndUpdate(
      req.params.id,
      { "ambulance.currentLocation": { lat, lng } },
      { new: true }
    );
    if (!request) return sendError(res, 404, "Request not found");

    if (io) {
      io.to(`user:${request.patient}`).emit("ambulance:locationUpdate", {
        requestId: request._id,
        location: { lat, lng },
      });
    }

    return sendSuccess(res, 200, "Location updated");
  } catch (err) {
    next(err);
  }
};

module.exports = { requestAmbulance, getMyRequests, getRequestById, updateRequestStatus, updateAmbulanceLocation, setSocketIO };
