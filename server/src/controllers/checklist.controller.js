import dbService from "../services/dbService.js";
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
      return res.status(400).json({ message: "This account is not linked to a customer facility. Contact an administrator." });
    }
    
    // Parse items using utility
    const parsedItems = await parseChecklistFile(
      req.file.buffer,
      req.file.originalname,
      name
    );
    
    const checklist = await dbService.createChecklist({
      name,
      standard: standard || "FSSAI",
      description: description || `Uploaded via file: ${req.file.originalname}`,
      items: parsedItems,
      customerId: customerId || null,
      uploadedBy: req.user._id || req.user.id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      isActive: true,
    });
    
    res.status(201).json({
      success: true,
      message: `Successfully uploaded checklist with ${parsedItems.length} parsed items`,
      checklist,
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
      
      if (!customerId) {
        return res.status(400).json({ message: "This account is not linked to a customer facility. Contact an administrator." });
      }
      
      filter.customerId = customerId;
    }
    
    const checklists = await dbService.getChecklists(filter);
      
    res.status(200).json({
      success: true,
      count: checklists.length,
      checklists,
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
    const checklist = await dbService.getChecklistById(req.params.id);
    if (!checklist) {
      return res.status(404).json({ message: "Checklist not found" });
    }
    
    // Access validation for customer role
    const custId = checklist.customerId?._id || checklist.customerId;
    if (req.user.role === "customer" && (!custId || custId.toString() !== req.user.customerId?.toString())) {
      return res.status(403).json({ message: "Unauthorized access to this checklist" });
    }
    
    res.status(200).json({
      success: true,
      checklist,
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
    const checklist = await dbService.getChecklistById(req.params.id);
    if (!checklist) {
      return res.status(404).json({ message: "Checklist not found" });
    }
    
    // Validate owner
    const uId = checklist.uploadedBy?._id || checklist.uploadedBy || checklist.uploaded_by;
    const currentUserId = req.user._id || req.user.id;
    if (req.user.role === "customer" && uId?.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this checklist" });
    }
    
    await dbService.deleteChecklist(req.params.id);
    
    res.status(200).json({
      success: true,
      message: "Checklist deleted successfully",
    });
  } catch (error) {
    console.error("Delete checklist error:", error.message);
    res.status(500).json({ message: "Server error while deleting checklist" });
  }
};
