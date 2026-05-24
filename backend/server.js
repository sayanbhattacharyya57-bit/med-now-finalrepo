require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const initSocket = require("./src/config/socket");
const logger = require("./src/utils/logger");
const { setSocketIO: setSosSocketIO } = require("./src/controllers/sosController");
const { setSocketIO: setAmbulanceSocketIO } = require("./src/controllers/ambulanceController");
const { setSocketIO: setNotificationSocketIO } = require("./src/services/notificationService");
const scheduledJobs = require("./src/services/scheduledJobs");
const seed = require("./src/utils/seeder");

const PORT = process.env.PORT || 8000;

const start = async () => {
  await connectDB();
  await seed();

  const httpServer = http.createServer(app);
  const io = initSocket(httpServer);

  setSosSocketIO(io);
  setAmbulanceSocketIO(io);
  setNotificationSocketIO(io);

  scheduledJobs.init();

  httpServer.listen(PORT, "localhost", () => {
    logger.info(`MedNow API running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
    logger.info(`Health check: http://localhost:${PORT}/api/v1/health`);
  });

  process.on("unhandledRejection", (err) => {
    logger.error(`Unhandled rejection: ${err.message}`);
    httpServer.close(() => process.exit(1));
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received — shutting down gracefully");
    httpServer.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });
};

start();
