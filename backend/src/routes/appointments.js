const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/appointmentController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const bookRules = [
  body("doctorId").notEmpty().isMongoId(),
  body("type").isIn(["in_person", "video_call", "voice_call", "chat"]),
  body("scheduledAt").isISO8601().withMessage("Valid date/time required"),
];

router.get("/slots", ctrl.getAvailableSlots);
router.get("/", authenticate, ctrl.getMyAppointments);
router.get("/:id", authenticate, ctrl.getAppointmentById);
router.post("/", authenticate, authorize("patient"), bookRules, validate, ctrl.bookAppointment);
router.patch("/:id/confirm", authenticate, authorize("doctor"), ctrl.confirmAppointment);
router.patch("/:id/cancel", authenticate, [body("reason").optional().trim()], validate, ctrl.cancelAppointment);
router.patch("/:id/reschedule", authenticate, [body("scheduledAt").isISO8601()], validate, ctrl.rescheduleAppointment);
router.patch("/:id/prescription", authenticate, authorize("doctor"), ctrl.addPrescription);
router.post("/:id/feedback", authenticate, authorize("patient"), [
  body("rating").isInt({ min: 1, max: 5 }),
], validate, ctrl.submitFeedback);

module.exports = router;
