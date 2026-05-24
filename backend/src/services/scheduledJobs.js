const cron = require("node-cron");
const Appointment = require("../models/Appointment");
const { sendAppointmentReminder } = require("./notificationService");
const logger = require("../utils/logger");

const sendUpcomingReminders = async () => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24hEnd = new Date(in24h.getTime() + 60 * 1000);

    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in1hEnd = new Date(in1h.getTime() + 60 * 1000);

    // 24-hour reminders
    const upcoming24h = await Appointment.find({
      scheduledAt: { $gte: in24h, $lt: in24hEnd },
      status: { $in: ["pending", "confirmed"] },
    }).populate("patient doctor", "name phone");

    for (const appt of upcoming24h) {
      if (!appt.remindersSent.some((d) => Math.abs(d - in24h) < 120000)) {
        await sendAppointmentReminder(appt);
        appt.remindersSent.push(new Date());
        await appt.save();
      }
    }

    // 1-hour reminders
    const upcoming1h = await Appointment.find({
      scheduledAt: { $gte: in1h, $lt: in1hEnd },
      status: { $in: ["pending", "confirmed"] },
    }).populate("patient doctor", "name phone");

    for (const appt of upcoming1h) {
      if (!appt.remindersSent.some((d) => Math.abs(d - in1h) < 120000)) {
        await sendAppointmentReminder(appt);
        appt.remindersSent.push(new Date());
        await appt.save();
      }
    }

    if (upcoming24h.length + upcoming1h.length > 0) {
      logger.info(`Sent reminders for ${upcoming24h.length + upcoming1h.length} appointments`);
    }
  } catch (err) {
    logger.error(`Reminder job failed: ${err.message}`);
  }
};

const markNoShows = async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const result = await Appointment.updateMany(
      { scheduledAt: { $lt: cutoff }, status: { $in: ["pending", "confirmed"] } },
      { status: "no_show" }
    );
    if (result.modifiedCount > 0) {
      logger.info(`Marked ${result.modifiedCount} appointments as no-show`);
    }
  } catch (err) {
    logger.error(`No-show job failed: ${err.message}`);
  }
};

const init = () => {
  // Every minute — check for appointment reminders
  cron.schedule("* * * * *", sendUpcomingReminders);

  // Every 30 minutes — mark overdue appointments as no-show
  cron.schedule("*/30 * * * *", markNoShows);

  logger.info("Scheduled jobs initialized");
};

module.exports = { init };
