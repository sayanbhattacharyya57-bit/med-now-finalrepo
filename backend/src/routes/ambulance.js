const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/ambulanceController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.post("/request", authenticate, [
  body("lat").isFloat({ min: -90, max: 90 }),
  body("lng").isFloat({ min: -180, max: 180 }),
  body("address").notEmpty().trim(),
], validate, ctrl.requestAmbulance);

router.get("/my", authenticate, ctrl.getMyRequests);
router.get("/:id", authenticate, ctrl.getRequestById);
router.patch("/:id/status", authenticate, authorize("hospital_admin"), ctrl.updateRequestStatus);
router.patch("/:id/location", authenticate, ctrl.updateAmbulanceLocation);

module.exports = router;
