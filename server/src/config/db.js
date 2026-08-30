import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { seedInitialUsers } from "../utils/seedAdmin.js";

let memoryServerInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`✅ Atlas MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.warn(`⚠️ Could not connect to Atlas MongoDB (${error.message}).`);
    }
  }

  console.log("⚡ Fallback: Starting in-memory MongoDB database...");
  try {
    memoryServerInstance = await MongoMemoryServer.create();
    const memUri = memoryServerInstance.getUri();
    await mongoose.connect(memUri);
    console.log(`✅ In-Memory MongoDB running & connected at ${memUri}`);
    
    // Seed initial users into memory DB so logins & signups work out of the box
    await seedInitialUsers();
  } catch (memErr) {
    console.error(`❌ In-Memory MongoDB startup failed: ${memErr.message}`);
  }
};

export default connectDB;
