const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/healthRecordController");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.get("/", authenticate, ctrl.getMyRecords);
router.get("/:id", authenticate, ctrl.getRecordById);

router.post("/", authenticate, [
  body("type").isIn(["consultation", "lab_result", "prescription", "imaging", "vaccination", "vitals", "other"]),
  body("title").notEmpty().trim(),
  body("recordDate").isISO8601(),
], validate, ctrl.createRecord);

router.put("/:id", authenticate, ctrl.updateRecord);
router.delete("/:id", authenticate, ctrl.deleteRecord);
router.patch("/:id/share", authenticate, ctrl.shareRecord);
router.post("/sync", authenticate, ctrl.syncOfflineRecords);

module.exports = router;
