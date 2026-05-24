const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },

    type: {
      type: String,
      enum: ["in_person", "video_call", "voice_call", "chat"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show", "rescheduled"],
      default: "pending",
    },

    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 30 },
    endTime: Date,

    symptoms: [String],
    notes: String,
    patientNotes: String,

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
      followUpDate: Date,
      issuedAt: Date,
    },

    callDetails: {
      roomId: String,
      startedAt: Date,
      endedAt: Date,
      duration: Number,
      recording: String,
    },

    payment: {
      amount: Number,
      status: { type: String, enum: ["pending", "paid", "refunded", "waived"], default: "pending" },
      method: String,
      transactionId: String,
      paidAt: Date,
    },

    cancellation: {
      reason: String,
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      cancelledAt: Date,
    },

    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    remindersSent: [{ type: Date }],
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date,
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ patient: 1, scheduledAt: -1 });
appointmentSchema.index({ doctor: 1, scheduledAt: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ scheduledAt: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
