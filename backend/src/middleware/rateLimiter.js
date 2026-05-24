const rateLimit = require("express-rate-limit");
const { sendError } = require("../utils/response");

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => sendError(res, 429, message),
  });

const generalLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  parseInt(process.env.RATE_LIMIT_MAX) || 100,
  "Too many requests, please try again later"
);

const authLimiter = createLimiter(15 * 60 * 1000, 10, "Too many login attempts, please try again after 15 minutes");

const sosLimiter = createLimiter(60 * 1000, 5, "SOS rate limit exceeded");

const chatbotLimiter = createLimiter(60 * 1000, 20, "Chatbot request limit exceeded, please slow down");

module.exports = { generalLimiter, authLimiter, sosLimiter, chatbotLimiter };
