const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const isPlaceholder = !uri || uri.includes("placeholder");

  if (isPlaceholder) {
    logger.info("No real MONGODB_URI found — starting embedded MongoDB for development…");
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create({
        instance: { dbName: "mednow" },
      });
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      logger.info(`Embedded MongoDB running at: ${memUri}`);
      logger.info("──────────────────────────────────────────────────────────────");
      logger.info("  DATA IS IN-MEMORY ONLY and will reset on server restart.");
      logger.info("  For persistence set MONGODB_URI in backend/.env");
      logger.info("  Get a free cluster at: https://www.mongodb.com/cloud/atlas");
      logger.info("──────────────────────────────────────────────────────────────");
    } catch (err) {
      logger.error(`Embedded MongoDB failed: ${err.message}`);
      logger.warn("API will start without database — all DB operations will fail.");
    }
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected. Attempting reconnect…");
    });
    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });
    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB error: ${err.message}`);
    });
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    logger.warn("Server will continue running without database connectivity.");
  }
};

module.exports = connectDB;
