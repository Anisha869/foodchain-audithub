import mongoose from "mongoose";
import { seedInitialUsers } from "../utils/seedAdmin.js";

let memoryServerInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000,
        dbName: process.env.MONGODB_DB_NAME || "foodchain-audithub",
      });
      console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return;
    } catch (error) {
      throw new Error(`Could not connect to MongoDB (${error.message})`, { cause: error });
    }
  }

  if (process.env.MONGODB_MEMORY !== "true") {
    throw new Error("MONGODB_URI is required. Set MONGODB_MEMORY=true only for temporary local development.");
  }

  console.log("⚡ Starting explicitly requested in-memory MongoDB database...");
  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    memoryServerInstance = await MongoMemoryServer.create();
    const memUri = memoryServerInstance.getUri();
    await mongoose.connect(memUri);
    console.log(`✅ In-Memory MongoDB running & connected at ${memUri}`);

    await seedInitialUsers();
  } catch (memErr) {
    throw new Error(`In-memory MongoDB startup failed (${memErr.message})`, { cause: memErr });
  }
};

export default connectDB;
