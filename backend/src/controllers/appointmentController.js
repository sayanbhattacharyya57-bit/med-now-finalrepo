const Appointment = require("../models/Appointment");
const User = require("../models/User");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { createNotification } = require("../services/notificationService");
const { v4: uuidv4 } = require("uuid");

const bookAppointment = async (req, res, next) => {
  try {
    const { doctorId, hospitalId, type, scheduledAt, duration = 30, symptoms, notes } = req.body;

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate < new Date()) return sendError(res, 400, "Cannot book appointment in the past");

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") return sendError(res, 404, "Doctor not found");
    if (!doctor.doctorProfile?.isAvailable) return sendError(res, 400, "Doctor is not available");

    // Check for slot conflicts
    const endTime = new Date(scheduledDate.getTime() + duration * 60000);
    const conflict = await Appointment.findOne({
      doctor: doctorId,
      status: { $in: ["pending", "confirmed"] },
      scheduledAt: { $lt: endTime },
      endTime: { $gt: scheduledDate },
    });
    if (conflict) return sendError(res, 409, "This time slot is already booked");

    const callRoomId = type !== "in_person" ? `mednow-${uuidv4()}` : undefined;

    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      hospital: hospitalId,
      type,
      scheduledAt: scheduledDate,
      endTime,
      duration,
      symptoms,
      notes,
      status: "pending",
      callDetails: callRoomId ? { roomId: callRoomId } : undefined,
      payment: {
        amount: doctor.doctorProfile?.consultationFee || 0,
        status: doctor.doctorProfile?.consultationFee ? "pending" : "waived",
      },
    });

    await appointment.populate([
      { path: "patient", select: "name email phone" },
      { path: "doctor", select: "name doctorProfile.specialization" },
    ]);

    // Send notifications
    await Promise.allSettled([
      createNotification({
        recipient: req.user._id,
        type: "appointment_booked",
        title: "Appointment Booked",
        message: `Your ${type.replace("_", " ")} appointment with Dr. ${doctor.name} has been booked for ${scheduledDate.toLocaleString()}`,
        data: { appointmentId: appointment._id, type, roomId: callRoomId },
        priority: "high",
      }),
      createNotification({
        recipient: doctorId,
        type: "appointment_booked",
        title: "New Appointment Request",
        message: `${req.user.name} has booked a ${type.replace("_", " ")} appointment for ${scheduledDate.toLocaleString()}`,
        data: { appointmentId: appointment._id },
        priority: "high",
      }),
    ]);

    return sendSuccess(res, 201, "Appointment booked successfully", { appointment });
  } catch (err) {
    next(err);
  }
};

const getMyAppointments = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20, upcoming } = req.query;
    const filter = {};

    if (req.user.role === "patient") filter.patient = req.user._id;
    else if (req.user.role === "doctor") filter.doctor = req.user._id;
    else return sendError(res, 403, "Unauthorized");

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (upcoming === "true") filter.scheduledAt = { $gte: new Date() };

    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate("patient", "name avatar phone patientProfile.bloodGroup")
        .populate("doctor", "name avatar doctorProfile.specialization doctorProfile.consultationFee")
        .populate("hospital", "name address.city phone")
        .sort({ scheduledAt: upcoming === "true" ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Appointment.countDocuments(filter),
    ]);

    return sendPaginated(res, appointments, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patient", "name avatar phone email patientProfile")
      .populate("doctor", "name avatar doctorProfile")
      .populate("hospital", "name address phone");

    if (!appointment) return sendError(res, 404, "Appointment not found");

    const isOwner =
      appointment.patient._id.toString() === req.user._id.toString() ||
      appointment.doctor._id.toString() === req.user._id.toString();
    if (!isOwner) return sendError(res, 403, "Not authorized");

    return sendSuccess(res, 200, "Appointment retrieved", { appointment });
  } catch (err) {
    next(err);
  }
};

const confirmAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 404, "Appointment not found");

    if (appointment.doctor.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Only the assigned doctor can confirm");
    }

    appointment.status = "confirmed";
    await appointment.save();

    await createNotification({
      recipient: appointment.patient,
      sender: req.user._id,
      type: "appointment_confirmed",
      title: "Appointment Confirmed",
      message: `Your appointment has been confirmed for ${new Date(appointment.scheduledAt).toLocaleString()}`,
      data: { appointmentId: appointment._id },
      priority: "high",
    });

    return sendSuccess(res, 200, "Appointment confirmed", { appointment });
  } catch (err) {
    next(err);
  }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 404, "Appointment not found");

    const isOwner =
      appointment.patient.toString() === req.user._id.toString() ||
      appointment.doctor.toString() === req.user._id.toString();
    if (!isOwner) return sendError(res, 403, "Not authorized");

    if (["completed", "cancelled"].includes(appointment.status)) {
      return sendError(res, 400, `Cannot cancel a ${appointment.status} appointment`);
    }

    appointment.status = "cancelled";
    appointment.cancellation = { reason, cancelledBy: req.user._id, cancelledAt: new Date() };
    await appointment.save();

    const notifyId =
      appointment.patient.toString() === req.user._id.toString()
        ? appointment.doctor
        : appointment.patient;

    await createNotification({
      recipient: notifyId,
      sender: req.user._id,
      type: "appointment_cancelled",
      title: "Appointment Cancelled",
      message: `An appointment on ${new Date(appointment.scheduledAt).toLocaleString()} has been cancelled. Reason: ${reason || "Not specified"}`,
      data: { appointmentId: appointment._id },
      priority: "high",
    });

    return sendSuccess(res, 200, "Appointment cancelled", { appointment });
  } catch (err) {
    next(err);
  }
};

const rescheduleAppointment = async (req, res, next) => {
  try {
    const { scheduledAt, reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 404, "Appointment not found");

    if (!["pending", "confirmed"].includes(appointment.status)) {
      return sendError(res, 400, "Only pending or confirmed appointments can be rescheduled");
    }

    const newDate = new Date(scheduledAt);
    if (newDate < new Date()) return sendError(res, 400, "Cannot reschedule to a past date");

    // Create new appointment based on old one
    const newAppointment = await Appointment.create({
      patient: appointment.patient,
      doctor: appointment.doctor,
      hospital: appointment.hospital,
      type: appointment.type,
      scheduledAt: newDate,
      endTime: new Date(newDate.getTime() + appointment.duration * 60000),
      duration: appointment.duration,
      symptoms: appointment.symptoms,
      status: "pending",
      rescheduledFrom: appointment._id,
      callDetails: appointment.callDetails?.roomId
        ? { roomId: `mednow-${uuidv4()}` }
        : undefined,
    });

    appointment.status = "rescheduled";
    appointment.cancellation = { reason: reason || "Rescheduled", cancelledBy: req.user._id, cancelledAt: new Date() };
    await appointment.save();

    const notifyId =
      appointment.patient.toString() === req.user._id.toString()
        ? appointment.doctor
        : appointment.patient;

    await createNotification({
      recipient: notifyId,
      type: "appointment_rescheduled",
      title: "Appointment Rescheduled",
      message: `Your appointment has been rescheduled to ${newDate.toLocaleString()}`,
      data: { appointmentId: newAppointment._id },
      priority: "high",
    });

    return sendSuccess(res, 200, "Appointment rescheduled", { appointment: newAppointment });
  } catch (err) {
    next(err);
  }
};

const addPrescription = async (req, res, next) => {
  try {
    const { medicines, advice, followUpDate } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 404, "Appointment not found");

    if (appointment.doctor.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Only the assigned doctor can add prescription");
    }

    appointment.prescription = { medicines, advice, followUpDate, issuedAt: new Date() };
    appointment.status = "completed";
    await appointment.save();

    await createNotification({
      recipient: appointment.patient,
      sender: req.user._id,
      type: "prescription_ready",
      title: "Prescription Ready",
      message: "Your doctor has added a prescription. You can view it in your health records.",
      data: { appointmentId: appointment._id },
      priority: "high",
    });

    return sendSuccess(res, 200, "Prescription added", { appointment });
  } catch (err) {
    next(err);
  }
};

const submitFeedback = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 404, "Appointment not found");

    if (appointment.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Only the patient can submit feedback");
    }
    if (appointment.status !== "completed") return sendError(res, 400, "Can only rate completed appointments");

    appointment.feedback = { rating, comment, submittedAt: new Date() };
    await appointment.save();

    // Update doctor rating
    const doctor = await User.findById(appointment.doctor);
    if (doctor) {
      const total = (doctor.doctorProfile.rating * doctor.doctorProfile.totalRatings + rating) /
        (doctor.doctorProfile.totalRatings + 1);
      doctor.doctorProfile.rating = Math.round(total * 10) / 10;
      doctor.doctorProfile.totalRatings += 1;
      await doctor.save();
    }

    return sendSuccess(res, 200, "Feedback submitted", { appointment });
  } catch (err) {
    next(err);
  }
};

const getAvailableSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return sendError(res, 400, "doctorId and date are required");

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") return sendError(res, 404, "Doctor not found");

    const requestedDate = new Date(date);
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][requestedDate.getDay()];

    const daySlot = doctor.doctorProfile?.availableSlots?.find((s) => s.day === dayName);
    if (!daySlot) return sendSuccess(res, 200, "No slots available on this day", { slots: [] });

    // Get booked slots for the day
    const startOfDay = new Date(requestedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(requestedDate.setHours(23, 59, 59, 999));

    const booked = await Appointment.find({
      doctor: doctorId,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["pending", "confirmed"] },
    }).select("scheduledAt duration");

    // Generate 30-min slots from start to end
    const slots = [];
    const [startH, startM] = daySlot.startTime.split(":").map(Number);
    const [endH, endM] = daySlot.endTime.split(":").map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    for (let m = start; m + 30 <= end; m += 30) {
      const slotDate = new Date(requestedDate);
      slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0);
      const slotEnd = new Date(slotDate.getTime() + 30 * 60000);

      const isBooked = booked.some((b) => {
        const bStart = new Date(b.scheduledAt);
        const bEnd = new Date(bStart.getTime() + (b.duration || 30) * 60000);
        return slotDate < bEnd && slotEnd > bStart;
      });

      const isPast = slotDate < new Date();

      slots.push({
        time: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
        datetime: slotDate,
        isAvailable: !isBooked && !isPast,
      });
    }

    return sendSuccess(res, 200, "Slots retrieved", { slots, doctorId, date });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  bookAppointment, getMyAppointments, getAppointmentById, confirmAppointment,
  cancelAppointment, rescheduleAppointment, addPrescription, submitFeedback, getAvailableSlots,
};
