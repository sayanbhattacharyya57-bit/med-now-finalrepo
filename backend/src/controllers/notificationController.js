const Notification = require("../models/Notification");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");

const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread, type } = req.query;
    const filter = { recipient: req.user._id };

    if (unread === "true") filter.isRead = false;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate("sender", "name avatar role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    return res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (ids && Array.isArray(ids)) {
      await Notification.updateMany(
        { _id: { $in: ids }, recipient: req.user._id },
        { isRead: true, readAt: new Date() }
      );
    } else {
      await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
      );
    }

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return sendSuccess(res, 200, "Notifications marked as read", { unreadCount });
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return sendError(res, 404, "Notification not found");
    await notification.deleteOne();
    return sendSuccess(res, 200, "Notification deleted");
  } catch (err) {
    next(err);
  }
};

const clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id, isRead: true });
    return sendSuccess(res, 200, "Read notifications cleared");
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyNotifications, markAsRead, deleteNotification, clearAll };
