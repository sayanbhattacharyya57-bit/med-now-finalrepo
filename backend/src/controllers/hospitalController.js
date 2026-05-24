const Hospital = require("../models/Hospital");
const User = require("../models/User");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { findNearestHospitals } = require("../services/geolocationService");
const notificationService = require("../services/notificationService");

const getAllHospitals = async (req, res, next) => {
  try {
    const { city, state, type, specialty, page = 1, limit = 20, search } = req.query;
    const filter = { isActive: true };

    if (city) filter["address.city"] = { $regex: city, $options: "i" };
    if (state) filter["address.state"] = { $regex: state, $options: "i" };
    if (type) filter.type = type;
    if (specialty) filter.specialties = { $in: [new RegExp(specialty, "i")] };
    if (search) filter.$text = { $search: search };

    const skip = (page - 1) * limit;
    const [hospitals, total] = await Promise.all([
      Hospital.find(filter).skip(skip).limit(parseInt(limit)).sort({ rating: -1 }),
      Hospital.countDocuments(filter),
    ]);

    return sendPaginated(res, hospitals, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate("doctors", "name avatar doctorProfile.specialization doctorProfile.isAvailable doctorProfile.rating");
    if (!hospital) return sendError(res, 404, "Hospital not found");
    return sendSuccess(res, 200, "Hospital retrieved", { hospital });
  } catch (err) {
    next(err);
  }
};

const getNearestHospitals = async (req, res, next) => {
  try {
    const { lat, lng, maxDistance = 50000, limit = 10, specialty, hasOxygen, hasBeds } = req.query;
    if (!lat || !lng) return sendError(res, 400, "lat and lng are required");

    const filter = {};
    if (specialty) filter.specialties = { $in: [new RegExp(specialty, "i")] };
    if (hasOxygen === "true") filter["oxygen.available"] = true;
    if (hasBeds === "true") filter["beds.available"] = { $gt: 0 };

    const hospitals = await findNearestHospitals({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      maxDistance: parseInt(maxDistance),
      limit: parseInt(limit),
      filter,
    });

    return sendSuccess(res, 200, "Nearest hospitals retrieved", { hospitals, count: hospitals.length });
  } catch (err) {
    next(err);
  }
};

const createHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.create(req.body);
    return sendSuccess(res, 201, "Hospital created", { hospital });
  } catch (err) {
    next(err);
  }
};

const updateHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return sendError(res, 404, "Hospital not found");

    const isAdmin = req.user.role === "hospital_admin" &&
      hospital.admins.some((a) => a.toString() === req.user._id.toString());

    if (req.user.role !== "hospital_admin" && !isAdmin) {
      return sendError(res, 403, "Not authorized to update this hospital");
    }

    const updated = await Hospital.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, 200, "Hospital updated", { hospital: updated });
  } catch (err) {
    next(err);
  }
};

const updateBedAvailability = async (req, res, next) => {
  try {
    const { available, icu, icuAvailable, emergency, emergencyAvailable } = req.body;
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return sendError(res, 404, "Hospital not found");

    const updates = {};
    if (available !== undefined) updates["beds.available"] = available;
    if (icu !== undefined) updates["beds.icu"] = icu;
    if (icuAvailable !== undefined) updates["beds.icuAvailable"] = icuAvailable;
    if (emergency !== undefined) updates["beds.emergency"] = emergency;
    if (emergencyAvailable !== undefined) updates["beds.emergencyAvailable"] = emergencyAvailable;
    updates.lastUpdated = new Date();

    const updated = await Hospital.findByIdAndUpdate(req.params.id, updates, { new: true });

    // Notify patients who might be waiting
    return sendSuccess(res, 200, "Bed availability updated", { beds: updated.beds });
  } catch (err) {
    next(err);
  }
};

const updateOxygenAvailability = async (req, res, next) => {
  try {
    const { available, cylindersAvailable, concentratorsAvailable } = req.body;
    const updates = {
      "oxygen.available": available,
      "oxygen.cylindersAvailable": cylindersAvailable,
      "oxygen.concentratorsAvailable": concentratorsAvailable,
      lastUpdated: new Date(),
    };

    const updated = await Hospital.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return sendError(res, 404, "Hospital not found");

    return sendSuccess(res, 200, "Oxygen availability updated", { oxygen: updated.oxygen });
  } catch (err) {
    next(err);
  }
};

const addDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.body;
    const [hospital, doctor] = await Promise.all([
      Hospital.findById(req.params.id),
      User.findById(doctorId),
    ]);

    if (!hospital) return sendError(res, 404, "Hospital not found");
    if (!doctor || doctor.role !== "doctor") return sendError(res, 404, "Doctor not found");

    if (!hospital.doctors.includes(doctorId)) {
      hospital.doctors.push(doctorId);
      await hospital.save();
    }

    doctor.doctorProfile = { ...doctor.doctorProfile?.toObject(), hospitalId: hospital._id };
    await doctor.save();

    return sendSuccess(res, 200, "Doctor added to hospital", { hospital });
  } catch (err) {
    next(err);
  }
};

const getHospitalStats = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id).lean();
    if (!hospital) return sendError(res, 404, "Hospital not found");

    const Appointment = require("../models/Appointment");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayAppointments, totalDoctors] = await Promise.all([
      Appointment.countDocuments({
        hospital: hospital._id,
        scheduledAt: { $gte: today },
        status: { $in: ["pending", "confirmed", "in_progress"] },
      }),
      User.countDocuments({ "doctorProfile.hospitalId": hospital._id, role: "doctor" }),
    ]);

    return sendSuccess(res, 200, "Stats retrieved", {
      beds: hospital.beds,
      oxygen: hospital.oxygen,
      ambulances: hospital.ambulances,
      todayAppointments,
      totalDoctors,
      lastUpdated: hospital.lastUpdated,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllHospitals, getHospitalById, getNearestHospitals, createHospital,
  updateHospital, updateBedAvailability, updateOxygenAvailability, addDoctor, getHospitalStats,
};
