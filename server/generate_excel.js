import xlsx from "xlsx";
import path from "path";

const data = [
  { "Category": "Hygiene", "Question": "Are kitchen countertops disinfected daily?", "Max Score": 10 },
  { "Category": "Hygiene", "Question": "Are employees wearing clean aprons and hairnets?", "Max Score": 10 },
  { "Category": "Safety", "Question": "Are fire exits free from obstacle blockages?", "Max Score": 10 },
  { "Category": "Safety", "Question": "Is the first-aid box fully supplied?", "Max Score": 10 },
  { "Category": "Quality", "Question": "Are incoming raw meats stored separately from leafy greens?", "Max Score": 10 },
  { "Category": "Temperature", "Question": "Are freezers maintaining temperature below -18 degrees Celsius?", "Max Score": 10 }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Safety Audit");

const filePath = path.resolve("../test_checklist.xlsx");
xlsx.writeFile(wb, filePath);
console.log("Excel file generated at:", filePath);
