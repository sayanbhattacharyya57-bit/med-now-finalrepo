const mongoose = require("mongoose");

const healthRecordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },

    type: {
      type: String,
      enum: ["consultation", "lab_result", "prescription", "imaging", "vaccination", "vitals", "other"],
      required: true,
    },

    title: { type: String, required: true },
    description: String,

    vitals: {
      bloodPressure: { systolic: Number, diastolic: Number },
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number,
      bmi: Number,
      oxygenSaturation: Number,
      bloodGlucose: Number,
      respiratoryRate: Number,
      recordedAt: Date,
    },

    diagnosis: {
      primary: String,
      secondary: [String],
      icdCodes: [String],
    },

    prescription: {
      medicines: [
        {
          name: String,
          dosage: String,
          frequency: String,
          duration: String,
          instructions: String,
        },
      ],
      advice: String,
    },

    labResults: [
      {
        test: String,
        result: String,
        normalRange: String,
        unit: String,
        isAbnormal: Boolean,
      },
    ],

    vaccinations: [
      {
        name: String,
        date: Date,
        nextDue: Date,
        batchNumber: String,
        administeredBy: String,
      },
    ],

    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    isOfflineSynced: { type: Boolean, default: false },
    syncedAt: Date,
    isShared: { type: Boolean, default: false },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isEncrypted: { type: Boolean, default: true },
    tags: [String],
    recordDate: { type: Date, required: true },
  },
  { timestamps: true }
);

healthRecordSchema.index({ patient: 1, recordDate: -1 });
healthRecordSchema.index({ patient: 1, type: 1 });
healthRecordSchema.index({ isOfflineSynced: 1 });

module.exports = mongoose.model("HealthRecord", healthRecordSchema);
