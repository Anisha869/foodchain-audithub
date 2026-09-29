import mongoose from "mongoose";
import { seedInitialUsers } from "../utils/seedAdmin.js";

let memoryServerInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  const isConfiguredAtlas =
    uri &&
    !uri.includes("your_mongodb_atlas_connection_string_here") &&
    (uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://"));

  if (isConfiguredAtlas) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`✅ Atlas MongoDB connected: ${conn.connection.host}`);
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
