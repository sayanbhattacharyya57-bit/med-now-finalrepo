const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/sosController");
const { authenticate, authorize } = require("../middleware/auth");
const { sosLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");

router.post("/trigger", authenticate, sosLimiter, [
  body("lat").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude required"),
  body("lng").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude required"),
], validate, ctrl.triggerSOS);

router.get("/my", authenticate, ctrl.getMySOS);
router.get("/active", authenticate, authorize("hospital_admin"), ctrl.getActiveSOSAlerts);
router.patch("/:id/resolve", authenticate, authorize("hospital_admin", "doctor"), ctrl.resolveSOSAlert);

module.exports = router;
