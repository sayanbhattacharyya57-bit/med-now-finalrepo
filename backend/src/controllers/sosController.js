const SOSAlert = require("../models/SOSAlert");
const AmbulanceRequest = require("../models/AmbulanceRequest");
const Hospital = require("../models/Hospital");
const { sendSuccess, sendError } = require("../utils/response");
const { findNearestHospitals, estimateTravelTime } = require("../services/geolocationService");
const { sendSOSAlert, createNotification } = require("../services/notificationService");
const logger = require("../utils/logger");

let io = null;
const setSocketIO = (socketIO) => { io = socketIO; };

const triggerSOS = async (req, res, next) => {
  try {
    const { lat, lng, address, accuracy, emergencyType = "medical", description, severity = "critical" } = req.body;

    if (!lat || !lng) return sendError(res, 400, "Location (lat/lng) is required for SOS");

    // Find nearest hospitals within 30km
    const nearbyHospitals = await findNearestHospitals({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      maxDistance: 30000,
      limit: 5,
    });

    const alert = await SOSAlert.create({
      patient: req.user._id,
      status: "active",
      location: { address, coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }, accuracy },
      emergency: { type: emergencyType, description, severity },
      respondingHospitals: nearbyHospitals.map((h) => ({
        hospital: h._id,
        status: "notified",
        distance: h.distance,
        estimatedArrival: estimateTravelTime(h.distance, "ambulance"),
      })),
      contacts: req.user.patientProfile?.emergencyContact
        ? [{
            name: req.user.patientProfile.emergencyContact.name,
            phone: req.user.patientProfile.emergencyContact.phone,
            notifiedAt: new Date(),
          }]
        : [],
    });

    await alert.populate("patient", "name phone patientProfile");

    // Real-time broadcast to hospitals
    if (io) {
      nearbyHospitals.forEach((h) => {
        io.to(`hospital:${h._id}`).emit("sos:alert", {
          alertId: alert._id,
          patient: { name: req.user.name, phone: req.user.phone },
          location: alert.location,
          emergency: alert.emergency,
          distance: h.distance,
          estimatedArrival: estimateTravelTime(h.distance, "ambulance"),
        });
      });
    }

    // Send notifications to hospital admins
    const hospitalsWithAdmins = await Hospital.find({
      _id: { $in: nearbyHospitals.map((h) => h._id) },
    }).select("admins name");

    await sendSOSAlert(alert, hospitalsWithAdmins);

    logger.warn(`SOS Alert triggered by ${req.user.name} at [${lat}, ${lng}]`);

    return sendSuccess(res, 201, "SOS alert sent successfully. Help is on the way.", {
      alertId: alert._id,
      nearbyHospitals: nearbyHospitals.map((h) => ({
        id: h._id,
        name: h.name,
        phone: h.phone,
        emergencyPhone: h.emergencyPhone,
        distance: h.distance,
        estimatedArrival: estimateTravelTime(h.distance, "ambulance"),
      })),
      emergencyNumbers: ["112", "108", "102"],
    });
  } catch (err) {
    next(err);
  }
};

const getMySOS = async (req, res, next) => {
  try {
    const alerts = await SOSAlert.find({ patient: req.user._id })
      .populate("respondingHospitals.hospital", "name phone address")
      .populate("ambulanceRequest")
      .sort({ createdAt: -1 })
      .limit(10);

    return sendSuccess(res, 200, "SOS alerts retrieved", { alerts });
  } catch (err) {
    next(err);
  }
};

const getActiveSOSAlerts = async (req, res, next) => {
  try {
    const alerts = await SOSAlert.find({ status: "active" })
      .populate("patient", "name phone patientProfile")
      .populate("respondingHospitals.hospital", "name")
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Active SOS alerts", { alerts, count: alerts.length });
  } catch (err) {
    next(err);
  }
};

const resolveSOSAlert = async (req, res, next) => {
  try {
    const { resolutionNotes, status = "resolved" } = req.body;
    const alert = await SOSAlert.findById(req.params.id);
    if (!alert) return sendError(res, 404, "SOS alert not found");

    alert.status = status;
    alert.resolvedAt = new Date();
    alert.resolvedBy = req.user._id;
    alert.resolutionNotes = resolutionNotes;
    await alert.save();

    if (io) {
      io.to(`user:${alert.patient}`).emit("sos:resolved", {
        alertId: alert._id,
        status,
        resolvedAt: alert.resolvedAt,
        message: resolutionNotes,
      });
    }

    await createNotification({
      recipient: alert.patient,
      type: "general",
      title: "SOS Alert Resolved",
      message: `Your emergency alert has been resolved. ${resolutionNotes || ""}`,
      priority: "high",
      data: { alertId: alert._id },
    });

    return sendSuccess(res, 200, "SOS alert resolved", { alert });
  } catch (err) {
    next(err);
  }
};

module.exports = { triggerSOS, getMySOS, getActiveSOSAlerts, resolveSOSAlert, setSocketIO };
