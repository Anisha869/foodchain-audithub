import mongoose from "mongoose";

export const getHealth = (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];

  res.status(200).json({
    status: "ok",
    service: "FoodChain AuditHub API",
    timestamp: new Date().toISOString(),
    database: dbStates[mongoose.connection.readyState] || "unknown",
    environment: process.env.NODE_ENV || "development",
  });
};
