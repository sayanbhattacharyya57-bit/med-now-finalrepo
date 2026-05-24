const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/chatbotController");
const { authenticate, optionalAuth } = require("../middleware/auth");
const { chatbotLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");

router.post("/message", optionalAuth, chatbotLimiter, [
  body("message").notEmpty().trim().isLength({ max: 2000 }),
  body("history").optional().isArray(),
  body("language").optional().isIn(["en", "hi", "ta", "te", "bn"]),
], validate, ctrl.sendMessage);

router.post("/analyze-symptoms", authenticate, chatbotLimiter, [
  body("symptoms").isArray({ min: 1 }).withMessage("At least one symptom required"),
], validate, ctrl.analyzeUserSymptoms);

router.get("/health-tip", optionalAuth, ctrl.getHealthTip);

module.exports = router;
