import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "./config/db.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import checklistRoutes from "./routes/checklist.routes.js";
import auditRoutes from "./routes/audit.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "https://foodchain-audithub.netlify.app",
  "http://localhost:5174",
  "http://localhost:5175",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const localhostMatch = /^https?:\/\/localhost:\d+$/.test(origin);
      if (localhostMatch) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/checklists", checklistRoutes);
app.use("/api/audits", auditRoutes);

app.get("/", (req, res) => {
  res.json({ message: "FoodChain AuditHub API is running" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// Start server after attempting DB connection so startup logs are ordered
async function startServer() {
  try {
    await connectDB();
  } catch (dbErr) {
    console.error("Database connection failed during startup:", dbErr.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please free the port or set PORT env variable to a different value.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    try {
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
        console.log('HTTP server closed');
      }

      if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log('MongoDB connection closed');
      }
    } catch (err) {
      console.error('Error during graceful shutdown:', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
}

startServer();
