import dotenv from "dotenv";
import connectDB from "../config/db.js";
import { seedInitialData } from "../services/dbService.js";

dotenv.config();

const run = async () => {
  if (process.env.DATA_MODE !== "demo") {
    throw new Error("Default or demo accounts are not seeded into Supabase. Set DATA_MODE=demo only for local testing.");
  }

  console.log("Starting local-only demo data seeding...");
  await connectDB();
  await seedInitialData();
  console.log("Local demo data is ready for this process.");
  process.exit(0);
};

if (process.argv[1] && process.argv[1].endsWith("seedAdmin.js")) {
  run().catch((err) => {
    console.error("Seed error:", err.message);
    process.exit(1);
  });
}

export { seedInitialData };
