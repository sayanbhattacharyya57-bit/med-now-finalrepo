const mongoose = require("mongoose");

const sosAlertSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["active", "acknowledged", "dispatched", "resolved", "false_alarm"],
      default: "active",
    },

    location: {
      address: String,
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      accuracy: Number,
    },

    emergency: {
      type: { type: String, enum: ["medical", "accident", "cardiac", "stroke", "fall", "other"], default: "medical" },
      description: String,
      severity: { type: String, enum: ["medium", "high", "critical"], default: "critical" },
    },

    respondingHospitals: [
      {
        hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
        respondedAt: Date,
        status: { type: String, enum: ["notified", "responding", "arrived"], default: "notified" },
        estimatedArrival: Number,
        distance: Number,
      },
    ],

    ambulanceRequest: { type: mongoose.Schema.Types.ObjectId, ref: "AmbulanceRequest" },

    contacts: [
      {
        name: String,
        phone: String,
        notifiedAt: Date,
        status: { type: String, enum: ["sent", "delivered", "failed"], default: "sent" },
      },
    ],

    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolutionNotes: String,
  },
  { timestamps: true }
);

sosAlertSchema.index({ patient: 1, createdAt: -1 });
sosAlertSchema.index({ status: 1 });
sosAlertSchema.index({ "location.coordinates": "2dsphere" });

module.exports = mongoose.model("SOSAlert", sosAlertSchema);
