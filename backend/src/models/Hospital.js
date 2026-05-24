const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ["government", "private", "clinic", "emergency_center"], required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    emergencyPhone: String,
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },
    facilities: [String],
    specialties: [String],

    beds: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      icu: { type: Number, default: 0 },
      icuAvailable: { type: Number, default: 0 },
      emergency: { type: Number, default: 0 },
      emergencyAvailable: { type: Number, default: 0 },
    },

    oxygen: {
      available: { type: Boolean, default: false },
      cylindersAvailable: { type: Number, default: 0 },
      concentratorsAvailable: { type: Number, default: 0 },
    },

    bloodBank: {
      available: { type: Boolean, default: false },
      groups: [
        {
          type: { type: String },
          units: { type: Number, default: 0 },
        },
      ],
    },

    ambulances: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
    },

    doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    operatingHours: {
      is24x7: { type: Boolean, default: false },
      hours: [
        {
          day: String,
          open: String,
          close: String,
          isClosed: { type: Boolean, default: false },
        },
      ],
    },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    logo: String,
    images: [String],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

hospitalSchema.index({ "address.coordinates": "2dsphere" });
hospitalSchema.index({ name: "text", "address.city": "text", specialties: "text" });
hospitalSchema.index({ "address.city": 1 });
hospitalSchema.index({ isActive: 1 });

module.exports = mongoose.model("Hospital", hospitalSchema);
