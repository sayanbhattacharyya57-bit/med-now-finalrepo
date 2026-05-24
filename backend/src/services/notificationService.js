const Notification = require("../models/Notification");
const logger = require("../utils/logger");

let io = null;

const setSocketIO = (socketIO) => { io = socketIO; };

const createNotification = async ({ recipient, sender, type, title, message, data = {}, channels = {}, priority = "normal", scheduledAt = null, expiresAt = null }) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      data,
      channels: { inApp: true, ...channels },
      priority,
      scheduledAt,
      expiresAt,
    });

    // Real-time delivery via Socket.io
    if (io) {
      io.to(`user:${recipient}`).emit("notification", {
        id: notification._id,
        type,
        title,
        message,
        data,
        priority,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (err) {
    logger.error(`Notification creation failed: ${err.message}`);
    throw err;
  }
};

const sendAppointmentReminder = async (appointment) => {
  const patientMsg = `Reminder: Your appointment with Dr. ${appointment.doctor?.name || "your doctor"} is scheduled at ${new Date(appointment.scheduledAt).toLocaleString()}`;
  const doctorMsg = `Reminder: You have an appointment with patient ${appointment.patient?.name || "a patient"} at ${new Date(appointment.scheduledAt).toLocaleString()}`;

  await Promise.all([
    createNotification({
      recipient: appointment.patient._id || appointment.patient,
      type: "appointment_reminder",
      title: "Appointment Reminder",
      message: patientMsg,
      data: { appointmentId: appointment._id },
      priority: "high",
    }),
    createNotification({
      recipient: appointment.doctor._id || appointment.doctor,
      type: "appointment_reminder",
      title: "Appointment Reminder",
      message: doctorMsg,
      data: { appointmentId: appointment._id },
      priority: "high",
    }),
  ]);
};

const sendSOSAlert = async (sosAlert, nearbyHospitals) => {
  const alerts = nearbyHospitals.map((hospital) =>
    hospital.admins?.map((adminId) =>
      createNotification({
        recipient: adminId,
        type: "sos_alert",
        title: "🚨 EMERGENCY SOS ALERT",
        message: `Emergency SOS from ${sosAlert.patient?.name || "a patient"} at ${sosAlert.location?.address || "unknown location"}. Immediate response required.`,
        data: {
          sosId: sosAlert._id,
          location: sosAlert.location,
          emergency: sosAlert.emergency,
        },
        priority: "urgent",
      })
    ) || []
  ).flat();

  await Promise.allSettled(alerts);
};

module.exports = { createNotification, sendAppointmentReminder, sendSOSAlert, setSocketIO };
