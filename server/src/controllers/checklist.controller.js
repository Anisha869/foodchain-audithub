import Checklist from "../models/Checklist.js";
import Customer from "../models/Customer.js";
import { parseChecklistFile } from "../utils/fileParser.js";

// @route   POST /api/checklists/upload
// @access  Private (Customer, Admin)
export const uploadChecklist = async (req, res) => {
  try {
    const { name, standard, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: "No checklist file uploaded" });
    }
    
    if (!name) {
      return res.status(400).json({ message: "Checklist name is required" });
    }
    
    // Auto-resolve customerId if missing or guest user
    let customerId = req.user.customerId;
    if (req.user.role === "customer" && !customerId) {
      let anyCust = await Customer.findOne();
      if (!anyCust) {
        anyCust = await Customer.create({
          companyName: "FoodChain Standard Client",
          code: "FCSC",
          contactPerson: req.user.name,
          email: req.user.email,
          isActive: true
        });
      }
      customerId = anyCust._id;
      req.user.customerId = customerId;
      await req.user.save();
    }
    
    // Parse items using utility
    const parsedItems = await parseChecklistFile(
      req.file.buffer,
      req.file.originalname,
      name
    );
    
    const checklist = await Checklist.create({
      name,
      standard: standard || "FSSAI",
      description: description || `Uploaded via file: ${req.file.originalname}`,
      items: parsedItems,
      customerId: customerId || null,
      uploadedBy: req.user._id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      message: `Successfully uploaded checklist with ${parsedItems.length} parsed items`,
      checklist
    });
  } catch (error) {
    console.error("Checklist upload error:", error);
    res.status(500).json({ message: "Server error while processing checklist file" });
  }
};

// @route   GET /api/checklists
// @access  Private (Customer, Auditor, Reviewer, Admin)
export const getChecklists = async (req, res) => {
  try {
    const filter = {};
    
    // Customers only see their own checklists
    if (req.user.role === "customer") {
      let customerId = req.user.customerId;
      
      // Auto-assign default customer if they don't have one
      if (!customerId) {
        const anyCust = await Customer.findOne();
        if (anyCust) {
          customerId = anyCust._id;
          req.user.customerId = customerId;
          await req.user.save();
        }
      }
      
      filter.customerId = customerId;
    }
    
    const checklists = await Checklist.find(filter)
      .populate("customerId", "companyName code")
      .sort({ createdAt: -1 });
      
    res.status(200).json({
      success: true,
      count: checklists.length,
      checklists
    });
  } catch (error) {
    console.error("Get checklists error:", error.message);
    res.status(500).json({ message: "Server error while fetching checklists" });
  }
};

// @route   GET /api/checklists/:id
// @access  Private
export const getChecklistById = async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id).populate("customerId", "companyName code");
    if (!checklist) {
      return res.status(404).json({ message: "Checklist not found" });
    }
    
    // Access validation for customer role
    if (req.user.role === "customer" && checklist.customerId && checklist.customerId.toString() !== req.user.customerId?.toString()) {
      return res.status(403).json({ message: "Unauthorized access to this checklist" });
    }
    
    res.status(200).json({
      success: true,
      checklist
    });
  } catch (error) {
    console.error("Get checklist error:", error.message);
    res.status(500).json({ message: "Server error while fetching checklist detail" });
  }
};

// @route   DELETE /api/checklists/:id
// @access  Private (Customer, Admin)
export const deleteChecklist = async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist) {
      return res.status(404).json({ message: "Checklist not found" });
    }
    
    // Validate owner
    if (req.user.role === "customer" && checklist.uploadedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this checklist" });
    }
    
    await Checklist.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: "Checklist deleted successfully"
    });
  } catch (error) {
    console.error("Delete checklist error:", error.message);
    res.status(500).json({ message: "Server error while deleting checklist" });
  }
};
