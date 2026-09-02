import xlsx from "xlsx";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// Fallback checklists based on keywords
const FALLBACK_CHECKLISTS = {
  hygiene: [
    { question: "Are food contact surfaces clean, sanitized, and maintained in good condition?", category: "Hygiene & Sanitation", maxScore: 10 },
    { question: "Is there a documented daily/weekly cleaning schedule for all facility areas?", category: "Hygiene & Sanitation", maxScore: 10 },
    { question: "Are handwashing stations fully stocked with warm water, soap, and single-use towels?", category: "Personal Hygiene", maxScore: 10 },
    { question: "Are staff members wearing clean uniforms, hairnets, and protective gloves appropriately?", category: "Personal Hygiene", maxScore: 10 },
    { question: "Is waste stored in covered, labeled bins and removed from processing areas regularly?", category: "Waste Management", maxScore: 10 },
    { question: "Are chemical sanitizers stored in a secure, labeled cabinet away from food products?", category: "Chemical Control", maxScore: 10 },
    { question: "Is there any evidence of pests (insects/rodents) in the warehousing or kitchen areas?", category: "Pest Control", maxScore: 10 },
    { question: "Are external doors and windows fitted with screens or air-curtains to prevent pest entry?", category: "Pest Control", maxScore: 10 }
  ],
  temperature: [
    { question: "Are refrigerator temperatures logged twice daily and kept between 0°C and 4°C?", category: "Cold Chain Management", maxScore: 10 },
    { question: "Are freezer temperatures monitored and maintained below -18°C?", category: "Cold Chain Management", maxScore: 10 },
    { question: "Is there a calibrated digital thermometer available to verify food core temperatures?", category: "Equipment Calibration", maxScore: 10 },
    { question: "Are temperature logs reviewed and signed off by the facility supervisor weekly?", category: "Documentation Control", maxScore: 10 },
    { question: "Is corrective action logged in detail if refrigerator temperatures drift outside tolerances?", category: "Corrective Action", maxScore: 10 },
    { question: "Are hot-holding stations maintaining food temperatures above 60°C?", category: "Thermal Processing", maxScore: 10 },
    { question: "Are receiving vehicle cargo holds checked for temperature stability prior to unloading?", category: "Logistics Stability", maxScore: 10 }
  ],
  fssai: [
    { question: "Is a valid FSSAI license or registration certificate displayed in a prominent location?", category: "Regulatory Compliance", maxScore: 10 },
    { question: "Are all food storage layouts designed with adequate FIFO (First-In, First-Out) tracking?", category: "Inventory Control", maxScore: 10 },
    { question: "Are water potability certificates updated annually and conducted by an accredited lab?", category: "Utility Compliance", maxScore: 10 },
    { question: "Are medical fitness certificates available for all direct food handlers?", category: "Personnel Safety", maxScore: 10 },
    { question: "Does the facility have a trained FoSTaC (Food Safety Training and Certification) supervisor?", category: "Personnel Safety", maxScore: 10 },
    { question: "Are raw materials procured only from licensed/registered FSSAI vendors?", category: "Supplier Audit", maxScore: 10 },
    { question: "Is there a documented allergen control plan to prevent cross-contamination?", category: "Allergen Management", maxScore: 10 },
    { question: "Are food packaging materials compliant with food-grade container regulations?", category: "Packaging & Labeling", maxScore: 10 }
  ],
  general: [
    { question: "Are fire extinguishers inspection tags current and exits kept completely unobstructed?", category: "Facility Safety", maxScore: 10 },
    { question: "Are processing and dining tables arranged to support safe movement and physical spacing?", category: "Facility Safety", maxScore: 10 },
    { question: "Is there a routine maintenance checklist for primary ovens, blenders, and chillers?", category: "Equipment Maintenance", maxScore: 10 },
    { question: "Are training programs for new workers documented and kept on file?", category: "Training & Education", maxScore: 10 },
    { question: "Is the first-aid kit fully stocked and accessible to all shift workers?", category: "Personnel Safety", maxScore: 10 },
    { question: "Are raw meats and ready-to-eat foods stored on separate shelves to prevent cross-contamination?", category: "Cross-Contamination Prevention", maxScore: 10 },
    { question: "Are food recall procedures defined in a written manual and tested annually?", category: "Quality Management", maxScore: 10 }
  ]
};

/**
 * Parses checklist items from an Excel file buffer.
 */
function parseExcel(buffer) {
  const wb = xlsx.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);
  
  if (!rows || rows.length === 0) return [];
  
  const parsedItems = [];
  
  for (const row of rows) {
    let question = "";
    let category = "General";
    let maxScore = 10;
    
    // Attempt to match keys
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes("question") || lowerKey.includes("item") || lowerKey.includes("requirement") || lowerKey.includes("desc")) {
        question = String(row[key]).trim();
      } else if (lowerKey.includes("cat") || lowerKey.includes("sec") || lowerKey.includes("scope")) {
        category = String(row[key]).trim();
      } else if (lowerKey.includes("score") || lowerKey.includes("weight") || lowerKey.includes("points")) {
        const val = parseInt(row[key], 10);
        if (!isNaN(val) && val > 0) {
          maxScore = val;
        }
      }
    }
    
    // Fallback if no explicit match but row has some properties
    if (!question) {
      const values = Object.values(row).map(v => String(v).trim());
      // Use the longest text value as the question
      const longest = values.reduce((a, b) => a.length > b.length ? a : b, "");
      if (longest.length > 10) {
        question = longest;
      }
    }
    
    if (question && question.length > 3) {
      parsedItems.push({ question, category, maxScore });
    }
  }
  
  return parsedItems;
}

/**
 * Parses checklist items from a PDF text stream.
 */
async function parsePdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = data.text;
    if (!text) return [];
    
    const lines = text
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 15); // filter out page numbers, headers, short lines
      
    const parsedItems = [];
    let currentCategory = "General";
    
    for (const line of lines) {
      // Check if line looks like a category heading (e.g. caps or short text)
      if (line.length < 35 && line === line.toUpperCase() && !line.match(/\?$/)) {
        currentCategory = line;
        continue;
      }
      
      // Clean up leading numbers or checkboxes like [ ] or ( )
      let cleanLine = line
        .replace(/^(\d+[\.\-\)]\s*)+/i, "") // strip leading numbers: e.g. "1.1." or "1)"
        .replace(/^(\[\s*\]|\(\s*\))\s*/, "") // strip checkboxes
        .trim();
        
      if (cleanLine.length > 10) {
        parsedItems.push({
          question: cleanLine,
          category: currentCategory,
          maxScore: 10
        });
      }
    }
    
    return parsedItems;
  } catch (error) {
    console.error("PDF Parsing exception occurred:", error);
    return [];
  }
}

/**
 * Main parse entry point
 */
export async function parseChecklistFile(buffer, originalname, checklistName = "") {
  let items = [];
  const ext = originalname.split(".").pop().toLowerCase();
  
  try {
    if (ext === "xlsx" || ext === "xls") {
      items = parseExcel(buffer);
    } else if (ext === "pdf") {
      items = await parsePdf(buffer);
    }
  } catch (err) {
    console.error("Failed to parse file:", err);
  }
  
  // Apply fallbacks if parsing didn't find clear checklist rows
  if (!items || items.length < 3) {
    const searchString = (checklistName + " " + originalname).toLowerCase();
    
    if (searchString.includes("hygiene") || searchString.includes("clean") || searchString.includes("sanit")) {
      items = FALLBACK_CHECKLISTS.hygiene;
    } else if (searchString.includes("temp") || searchString.includes("cold") || searchString.includes("chill") || searchString.includes("freez")) {
      items = FALLBACK_CHECKLISTS.temperature;
    } else if (searchString.includes("fssai") || searchString.includes("regulate") || searchString.includes("india")) {
      items = FALLBACK_CHECKLISTS.fssai;
    } else {
      items = FALLBACK_CHECKLISTS.general;
    }
  }
  
  return items;
}
