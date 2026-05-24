const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    type: {
      type: String,
      enum: [
        "appointment_booked",
        "appointment_confirmed",
        "appointment_cancelled",
        "appointment_reminder",
        "appointment_rescheduled",
        "sos_alert",
        "ambulance_update",
        "medicine_update",
        "bed_update",
        "prescription_ready",
        "lab_result_ready",
        "general",
        "emergency",
      ],
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    channels: {
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },

    isRead: { type: Boolean, default: false },
    readAt: Date,

    status: {
      inApp: { type: String, enum: ["pending", "delivered", "failed"], default: "delivered" },
      push: { type: String, enum: ["pending", "delivered", "failed"], default: "pending" },
      email: { type: String, enum: ["pending", "delivered", "failed"], default: "pending" },
    },

    scheduledAt: Date,
    expiresAt: Date,
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ scheduledAt: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
