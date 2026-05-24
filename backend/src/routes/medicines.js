const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/medicineController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.get("/", ctrl.getMedicines);
router.get("/low-stock", authenticate, authorize("hospital_admin"), ctrl.getLowStockAlerts);
router.get("/:id", ctrl.getMedicineById);

router.post("/", authenticate, authorize("hospital_admin"), [
  body("name").notEmpty().trim(),
  body("category").isIn(["tablet", "capsule", "syrup", "injection", "cream", "drops", "inhaler", "other"]),
  body("hospitalId").isMongoId(),
  body("stock.quantity").isInt({ min: 0 }),
], validate, ctrl.addMedicine);

router.put("/:id", authenticate, authorize("hospital_admin"), ctrl.updateMedicine);
router.patch("/:id/stock", authenticate, authorize("hospital_admin"), [
  body("quantity").isInt({ min: 0 }),
], validate, ctrl.updateStock);
router.delete("/:id", authenticate, authorize("hospital_admin"), ctrl.deleteMedicine);

module.exports = router;
