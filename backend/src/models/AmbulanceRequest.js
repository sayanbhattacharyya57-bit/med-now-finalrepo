const mongoose = require("mongoose");

const ambulanceRequestSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },

    requestedBy: {
      name: String,
      phone: { type: String, required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    status: {
      type: String,
      enum: ["requested", "accepted", "dispatched", "en_route", "arrived", "completed", "cancelled"],
      default: "requested",
    },

    pickup: {
      address: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      landmark: String,
    },

    destination: {
      hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
      address: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    emergency: {
      type: { type: String, enum: ["medical", "accident", "cardiac", "stroke", "maternity", "other"] },
      description: String,
      severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "high" },
    },

    ambulance: {
      vehicleNumber: String,
      driverName: String,
      driverPhone: String,
      currentLocation: {
        lat: Number,
        lng: Number,
      },
      estimatedArrival: Date,
    },

    timeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],

    distance: Number,
    estimatedCost: Number,
    actualCost: Number,
    notes: String,
  },
  { timestamps: true }
);

ambulanceRequestSchema.index({ patient: 1, createdAt: -1 });
ambulanceRequestSchema.index({ status: 1 });
ambulanceRequestSchema.index({ hospital: 1 });

module.exports = mongoose.model("AmbulanceRequest", ambulanceRequestSchema);
