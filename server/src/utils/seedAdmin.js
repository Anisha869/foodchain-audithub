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
    name: "Audit Planner",
    email: "planner@foodchainaudithub.com",
    password: "Planner@123",
    role: "planner",
  },
  {
    name: "Field Compliance Auditor",
    email: "auditor@foodchainaudithub.com",
    password: "Auditor@123",
    role: "auditor",
    specialization: "FSSAI, ISO 22000, HACCP",
    certifications: ["Lead Auditor ISO 22000", "FSSAI Certified Master Trainer"],
    experienceYears: 6,
    qualification: "M.Sc Food Safety & Technology",
    auditorIdCode: "AUD-REG-8821",
    address: "North Zone Quality Desk",
    bio: "Certified lead compliance auditor with 6+ years experience in second-party food safety inspections.",
  },
  {
    name: "Technical Reviewer",
    email: "reviewer@foodchainaudithub.com",
    password: "Reviewer@123",
    role: "reviewer",
  },
  {
    name: "Facility Quality Customer",
    email: "customer@foodchainaudithub.com",
    password: "Customer@123",
    role: "customer",
  },
];

export const seedInitialUsers = async () => {
  // 1. Seed Customer entity
  let customerObj = null;
  try {
    const Customer = (await import("../models/Customer.js")).default;
    customerObj = await Customer.findOne({ code: "FC-QP01" });
    if (!customerObj) {
      customerObj = await Customer.create({
        companyName: "FoodChain Quality Processing Client",
        code: "FC-QP01",
        contactPerson: "Quality Assurance Desk",
        email: "client@foodchainaudithub.com",
        phone: "+1 555-0199",
        address: "100 Quality Processing Way, Industrial Zone",
        industryCategory: "Food Processing & Logistics",
        isActive: true,
      });
      console.log("✅ Seeded [customers] collection: FoodChain Quality Processing Client");
    }
  } catch (err) {
    console.error("Customer seed error:", err.message);
  }

  // 2. Seed Site entity
  let siteObj = null;
  try {
    if (customerObj) {
      const Site = (await import("../models/Site.js")).default;
      siteObj = await Site.findOne({ siteCode: "CPP-01" });
      if (!siteObj) {
        siteObj = await Site.create({
          customerId: customerObj._id,
          siteName: "Central Processing Facility",
          siteCode: "CPP-01",
          address: "100 Quality Processing Way, Block B",
          city: "Metropolis",
          state: "State HQ",
          contactPerson: "Site Operations Manager",
          contactPhone: "+1 555-0188",
          isActive: true,
        });
        console.log("✅ Seeded [sites] collection: Central Processing Facility");
      }
    }
  } catch (err) {
    console.error("Site seed error:", err.message);
  }

  // 3. Seed Role Users (Admin, Planner, Auditor, Reviewer, CustomerUser)
  let auditorUser = null;
  for (const userData of seedUsers) {
    const Model = getModelByRole(userData.role);
    if (!Model) continue;

    const existing = await Model.findOne({ email: userData.email });

    if (existing) {
      if (userData.role === "auditor") auditorUser = existing;
      console.log(`ℹ️ User exists in [${userData.role}s] collection: ${userData.email}`);
      continue;
    }

    const payload = {
      ...userData,
      isActive: true,
    };
    if (userData.role === "customer" && customerObj) {
      payload.customerId = customerObj._id;
    }

    const created = await Model.create(payload);
    if (userData.role === "auditor") auditorUser = created;
    console.log(`✅ User created in [${userData.role}s] collection: ${userData.email}`);
  }

  // 4. Seed Master Checklist format
  let masterChecklist = null;
  try {
    const Checklist = (await import("../models/Checklist.js")).default;
    masterChecklist = await Checklist.findOne();
    if (!masterChecklist) {
      masterChecklist = await Checklist.create({
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
      console.log("✅ Seeded [checklists] collection: Master FSSAI Checklist");
    }
  } catch (err) {
    console.error("Checklist seeding error:", err.message);
  }

  // 5. Seed Audit record
  let sampleAudit = null;
  try {
    const Audit = (await import("../models/Audit.js")).default;
    sampleAudit = await Audit.findOne({ auditRef: "FSSA-1001" });
    if (!sampleAudit && customerObj && siteObj) {
      sampleAudit = await Audit.create({
        auditRef: "FSSA-1001",
        customerId: customerObj._id,
        siteId: siteObj._id,
        auditorId: auditorUser ? auditorUser._id : null,
        checklistId: masterChecklist ? masterChecklist._id : null,
        standard: "FSSAI",
        scheduledDate: new Date(),
        status: "SCHEDULED",
        score: null,
        answers: masterChecklist ? masterChecklist.items.map((item) => ({
          itemId: item._id.toString(),
          question: item.question,
          category: item.category,
          score: 10,
          maxScore: 10,
          comment: "",
          severity: "None",
          evidence: ""
        })) : [],
        notes: "Initial scheduled second-party hygiene audit."
      });
      console.log("✅ Seeded [audits] collection: Initial Audit Ref FSSA-1001");
    }
  } catch (err) {
    console.error("Audit seeding error:", err.message);
  }

  // 6. Seed Finding record
  try {
    if (sampleAudit) {
      const Finding = (await import("../models/Finding.js")).default;
      const existingFinding = await Finding.findOne({ auditId: sampleAudit._id });
      if (!existingFinding) {
        await Finding.create({
          auditId: sampleAudit._id,
          category: "Temperature Control",
          severity: "minor",
          description: "Digital temperature log display offset by 0.5 degrees.",
          evidence: "Calibration logger certificate inspection",
          correctiveAction: "Recalibrate temperature sensor probe within 7 days.",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "open"
        });
        console.log("✅ Seeded [findings] collection: Sample non-conformity finding");
      }
    }
  } catch (err) {
    console.error("Finding seeding error:", err.message);
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

