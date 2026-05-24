const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notificationController");
const { authenticate } = require("../middleware/auth");

router.get("/", authenticate, ctrl.getMyNotifications);
router.patch("/read", authenticate, ctrl.markAsRead);
router.delete("/clear", authenticate, ctrl.clearAll);
router.delete("/:id", authenticate, ctrl.deleteNotification);

module.exports = router;
