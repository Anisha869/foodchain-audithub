import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { getModelByRole } from "../utils/roleModels.js";

dotenv.config();

const seedUsers = [
  {
    name: "System Administrator",
    email: "admin@foodchainaudithub.com",
    password: "Admin@12345",
    role: "admin",
  },
  {
    name: "Field Auditor",
    email: "auditor@foodchainaudithub.com",
    password: "Auditor@123",
    role: "auditor",
  },
  {
    name: "Technical Reviewer",
    email: "reviewer@foodchainaudithub.com",
    password: "Reviewer@123",
    role: "reviewer",
  },
  {
    name: "Customer User",
    email: "customer@foodchainaudithub.com",
    password: "Customer@123",
    role: "customer",
  },
];

export const seedInitialUsers = async () => {
  for (const userData of seedUsers) {
    const Model = getModelByRole(userData.role);
    if (!Model) continue;

    const existing = await Model.findOne({ email: userData.email });

    if (existing) {
      console.log(`ℹ️ User already exists in ${userData.role} collection: ${userData.email}`);
      continue;
    }

    await Model.create({
      ...userData,
      isActive: true,
    });
    console.log(`✅ User created in [${userData.role}s] collection: ${userData.email}`);
  }

  // Seed default checklist if none exists
  try {
    const Checklist = (await import("../models/Checklist.js")).default;
    const existingChecklist = await Checklist.findOne();
    if (!existingChecklist) {
      await Checklist.create({
        name: "FSSAI Food Hygiene & Safety Master Checklist",
        standard: "FSSAI",
        description: "Standard Food Safety Audit checklist covering hygiene, temperature, storage, and pest control.",
        fileName: "fssai_master_checklist_2026.xlsx",
        fileSize: 18420,
        items: [
          { question: "Are food handlers wearing clean protective gear, aprons, and hairnets?", category: "Personal Hygiene", maxScore: 10 },
          { question: "Is potability test certificate available for all processing water sources?", category: "Water Quality", maxScore: 10 },
          { question: "Are cold storage rooms maintained at or below 4°C with calibrated loggers?", category: "Temperature Control", maxScore: 10 },
          { question: "Is raw meat and poultry segregated from ready-to-eat products?", category: "Cross-Contamination", maxScore: 10 },
          { question: "Are chemical sanitizers and cleaning agents stored in labeled separate cabinets?", category: "Chemical Safety", maxScore: 10 },
          { question: "Are air curtains and insect light traps operational at all facility entrances?", category: "Pest Elimination", maxScore: 10 },
          { question: "Is FIFO (First In First Out) inventory management strictly enforced for ingredients?", category: "Storage & Stock", maxScore: 10 },
          { question: "Are food contact surfaces sanitized before and after each production shift?", category: "Sanitation & Cleaning", maxScore: 10 },
          { question: "Are daily CCP (Critical Control Point) monitoring logs signed by QA manager?", category: "Documentation & HACCP", maxScore: 10 },
          { question: "Are waste disposal bins covered, foot-operated, and emptied at required intervals?", category: "Waste Management", maxScore: 10 }
        ],
        isActive: true
      });
      console.log("✅ Seeded default FSSAI Master Checklist");
    }
  } catch (err) {
    console.error("Checklist seeding error:", err.message);
  }
};

const run = async () => {
  await connectDB();
  await seedInitialUsers();
  await mongoose.connection.close();
  process.exit(0);
};

if (process.argv[1] && process.argv[1].endsWith("seedAdmin.js")) {
  run().catch((err) => {
    console.error("Seed error:", err.message);
    process.exit(1);
  });
}

