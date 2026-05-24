const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2, max: 100 }),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("phone").trim().notEmpty().matches(/^[6-9]\d{9}$/).withMessage("Valid Indian phone number required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage("Password must contain uppercase, lowercase and number"),
  body("role").optional().isIn(["patient", "doctor", "hospital_admin"]),
];

const loginRules = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/register", authLimiter, registerRules, validate, ctrl.register);
router.post("/login", authLimiter, loginRules, validate, ctrl.login);
router.post("/refresh-token", ctrl.refreshToken);
router.post("/logout", authenticate, ctrl.logout);
router.get("/me", authenticate, ctrl.getMe);
router.put("/profile", authenticate, ctrl.updateProfile);
router.put("/change-password", authenticate, [
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min: 8 }),
], validate, ctrl.changePassword);
router.get("/doctors", ctrl.getDoctors);

module.exports = router;
