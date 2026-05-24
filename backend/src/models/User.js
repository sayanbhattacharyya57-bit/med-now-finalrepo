const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["patient", "doctor", "hospital_admin"], default: "patient" },
    avatar: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    language: { type: String, enum: ["en", "hi", "ta", "te", "bn"], default: "en" },

    // Patient-specific
    patientProfile: {
      dateOfBirth: Date,
      gender: { type: String, enum: ["male", "female", "other"] },
      bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      allergies: [String],
      chronicConditions: [String],
      emergencyContact: {
        name: String,
        phone: String,
        relation: String,
      },
      address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        coordinates: {
          lat: Number,
          lng: Number,
        },
      },
    },

    // Doctor-specific
    doctorProfile: {
      specialization: String,
      qualifications: [String],
      experience: Number,
      licenseNumber: String,
      hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
      consultationFee: Number,
      availableSlots: [
        {
          day: { type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
          startTime: String,
          endTime: String,
        },
      ],
      rating: { type: Number, default: 0, min: 0, max: 5 },
      totalRatings: { type: Number, default: 0 },
      isAvailable: { type: Boolean, default: true },
    },

    // Hospital Admin-specific
    adminProfile: {
      hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
      designation: String,
    },

    fcmTokens: [String],
    refreshToken: { type: String, select: false },
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ "patientProfile.address.coordinates": "2dsphere" });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
