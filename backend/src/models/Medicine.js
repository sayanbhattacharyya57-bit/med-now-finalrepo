const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    genericName: String,
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    category: {
      type: String,
      enum: ["tablet", "capsule", "syrup", "injection", "cream", "drops", "inhaler", "other"],
      required: true,
    },
    manufacturer: String,
    description: String,

    stock: {
      quantity: { type: Number, required: true, min: 0, default: 0 },
      unit: { type: String, default: "units" },
      minThreshold: { type: Number, default: 10 },
      expiryDate: Date,
      batchNumber: String,
    },

    price: {
      mrp: Number,
      hospitalPrice: Number,
      isSubsidized: { type: Boolean, default: false },
    },

    prescriptionRequired: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },

    usage: String,
    sideEffects: [String],
    contraindications: [String],
    storageConditions: String,

    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

medicineSchema.index({ hospital: 1, name: 1 });
medicineSchema.index({ name: "text", genericName: "text" });
medicineSchema.index({ isAvailable: 1 });

module.exports = mongoose.model("Medicine", medicineSchema);
