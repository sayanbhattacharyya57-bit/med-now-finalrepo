const User = require("../models/User");
const { generateTokenPair, verifyRefreshToken } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/response");
const { createNotification } = require("../services/notificationService");
const logger = require("../utils/logger");

const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role = "patient", language } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return sendError(res, 409, "Email already registered");

    const user = await User.create({ name, email, phone, password, role, language });

    await createNotification({
      recipient: user._id,
      type: "general",
      title: "Welcome to MedNow!",
      message: `Welcome ${name}! Quality healthcare is now at your fingertips.`,
      priority: "normal",
    });

    const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, 201, "Registration successful", {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email, ...(role && { role }) }).select("+password +refreshToken");
    if (!user) return sendError(res, 401, "Invalid email or password");
    if (!user.isActive) return sendError(res, 403, "Account deactivated. Contact support.");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return sendError(res, 401, "Invalid email or password");

    const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${user.email} (${user.role})`);

    return sendSuccess(res, 200, "Login successful", {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return sendError(res, 400, "Refresh token required");

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return sendError(res, 401, "Invalid or expired refresh token");
    }

    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      return sendError(res, 401, "Refresh token revoked or mismatched");
    }

    const { accessToken, refreshToken: newRefresh } = generateTokenPair(user._id, user.role);
    user.refreshToken = newRefresh;
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, 200, "Token refreshed", { accessToken, refreshToken: newRefresh });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
    return sendSuccess(res, 200, "Logged out successfully");
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  return sendSuccess(res, 200, "Profile retrieved", { user: req.user.toSafeObject() });
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, language, patientProfile, doctorProfile } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (language) updates.language = language;

    if (req.user.role === "patient" && patientProfile) {
      updates.patientProfile = { ...req.user.patientProfile?.toObject(), ...patientProfile };
    }
    if (req.user.role === "doctor" && doctorProfile) {
      updates.doctorProfile = { ...req.user.doctorProfile?.toObject(), ...doctorProfile };
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return sendSuccess(res, 200, "Profile updated", { user: updated.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return sendError(res, 401, "Current password is incorrect");

    user.password = newPassword;
    await user.save();
    return sendSuccess(res, 200, "Password changed successfully");
  } catch (err) {
    next(err);
  }
};

const getDoctors = async (req, res, next) => {
  try {
    const { specialization, hospitalId, available, page = 1, limit = 20 } = req.query;
    const filter = { role: "doctor", isActive: true };

    if (specialization) filter["doctorProfile.specialization"] = { $regex: specialization, $options: "i" };
    if (hospitalId) filter["doctorProfile.hospitalId"] = hospitalId;
    if (available === "true") filter["doctorProfile.isAvailable"] = true;

    const skip = (page - 1) * limit;
    const [doctors, total] = await Promise.all([
      User.find(filter).select("name avatar doctorProfile").skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: doctors,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, logout, getMe, updateProfile, changePassword, getDoctors };
