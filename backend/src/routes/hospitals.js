const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/hospitalController");
const { authenticate, authorize } = require("../middleware/auth");

router.get("/", ctrl.getAllHospitals);
router.get("/nearest", ctrl.getNearestHospitals);
router.get("/:id", ctrl.getHospitalById);
router.get("/:id/stats", authenticate, ctrl.getHospitalStats);

router.post("/", authenticate, authorize("hospital_admin"), ctrl.createHospital);
router.put("/:id", authenticate, authorize("hospital_admin"), ctrl.updateHospital);
router.patch("/:id/beds", authenticate, authorize("hospital_admin"), ctrl.updateBedAvailability);
router.patch("/:id/oxygen", authenticate, authorize("hospital_admin"), ctrl.updateOxygenAvailability);
router.post("/:id/doctors", authenticate, authorize("hospital_admin"), ctrl.addDoctor);

module.exports = router;
