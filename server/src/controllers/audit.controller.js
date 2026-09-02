import Audit from "../models/Audit.js";
import Checklist from "../models/Checklist.js";
import Customer from "../models/Customer.js";
import Site from "../models/Site.js";

// @route   GET /api/audits
// @access  Private (Admin, Auditor, Reviewer, Customer)
export const getAudits = async (req, res) => {
  try {
    const filter = {};
    
    if (req.user.role === "customer") {
      let customerId = req.user.customerId;
      if (!customerId) {
        const anyCust = await Customer.findOne();
        if (anyCust) {
          customerId = anyCust._id;
          req.user.customerId = customerId;
          await req.user.save();
        }
      }
      filter.customerId = customerId;
    } else if (req.user.role === "auditor") {
      // Show audits assigned to this auditor, or unassigned ones that they can take
      filter.$or = [
        { auditorId: req.user._id },
        { auditorId: null }
      ];
    }
    // Reviewers and Admins see ALL audits across all statuses
    
    const audits = await Audit.find(filter)
      .populate("customerId", "companyName code contactPerson email")
      .populate("siteId", "siteName siteCode address city state")
      .populate("checklistId", "name standard description")
      .sort({ scheduledDate: -1 });
      
    res.status(200).json({
      success: true,
      count: audits.length,
      audits
    });
  } catch (error) {
    console.error("Get audits error:", error.message);
    res.status(500).json({ message: "Server error while fetching audits" });
  }
};

// @route   GET /api/audits/:id
// @access  Private
export const getAuditById = async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id)
      .populate("customerId", "companyName code contactPerson email")
      .populate("siteId", "siteName siteCode address city state")
      .populate("checklistId", "name standard description items");
      
    if (!audit) {
      return res.status(404).json({ message: "Audit not found" });
    }
    
    // Access control for customer
    if (req.user.role === "customer" && audit.customerId?._id.toString() !== req.user.customerId?.toString()) {
      return res.status(403).json({ message: "Not authorized to access this audit report" });
    }
    
    res.status(200).json({
      success: true,
      audit
    });
  } catch (error) {
    console.error("Get audit error:", error.message);
    res.status(500).json({ message: "Server error while fetching audit details" });
  }
};

// @route   POST /api/audits
// @access  Private (Admin, Auditor)
export const createAudit = async (req, res) => {
  try {
    const { customerId, siteId, standard, scheduledDate, notes, checklistId } = req.body;
    
    let targetCustId = customerId;
    if (!targetCustId) {
      let cust = await Customer.findOne();
      if (!cust) {
        cust = await Customer.create({
          companyName: "FoodChain Standard Client",
          code: "FCSC",
          contactPerson: "QA Desk",
          email: "client@foodchainaudithub.com",
          isActive: true
        });
      }
      targetCustId = cust._id;
    }

    let targetSiteId = siteId;
    if (!targetSiteId) {
      let site = await Site.findOne({ customerId: targetCustId });
      if (!site) {
        site = await Site.create({
          customerId: targetCustId,
          siteName: "Central Processing Facility",
          siteCode: "CPF-01",
          address: "100 Quality Way, Industrial Zone",
          city: "Metropolis",
          state: "State HQ",
          isActive: true
        });
      }
      targetSiteId = site._id;
    }

    const scheduledDateVal = scheduledDate || new Date();
    
    // Generate a unique 8-character audit reference
    const refPrefix = standard ? standard.substring(0, 4).toUpperCase() : "AUD";
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const auditRef = `${refPrefix}-${randNum}`;
    
    // Check if auditor is scheduling this
    let auditorId = null;
    if (req.user.role === "auditor") {
      auditorId = req.user._id;
    }

    let answers = [];
    let status = "SCHEDULED";
    let linkedChecklistId = null;

    if (checklistId) {
      const checklist = await Checklist.findById(checklistId);
      if (checklist && checklist.items && checklist.items.length > 0) {
        linkedChecklistId = checklist._id;
        status = "IN_PROGRESS";
        answers = checklist.items.map(item => ({
          itemId: item._id?.toString() || Math.random().toString(36).substring(7),
          question: item.question,
          category: item.category || "General",
          score: 10,
          maxScore: item.maxScore || 10,
          comment: "",
          severity: "None",
          evidence: ""
        }));
      }
    }
    
    const audit = await Audit.create({
      auditRef,
      customerId: targetCustId,
      siteId: targetSiteId,
      auditorId,
      standard: standard || "FSSAI",
      scheduledDate: scheduledDateVal,
      status,
      checklistId: linkedChecklistId,
      answers,
      notes
    });

    const populatedAudit = await Audit.findById(audit._id)
      .populate("customerId", "companyName code contactPerson email")
      .populate("siteId", "siteName siteCode address city state")
      .populate("checklistId", "name standard description");
    
    res.status(201).json({
      success: true,
      message: "Audit scheduled successfully",
      audit: populatedAudit
    });
  } catch (error) {
    console.error("Create audit error:", error.message);
    res.status(500).json({ message: "Server error while scheduling audit" });
  }
};

// @route   POST /api/audits/:id/start-checklist
// @access  Private (Auditor)
export const startAuditChecklist = async (req, res) => {
  try {
    const { checklistId } = req.body;
    
    if (!checklistId) {
      return res.status(400).json({ message: "Please select a checklist to start" });
    }
    
    const audit = await Audit.findById(req.params.id);
    if (!audit) {
      return res.status(404).json({ message: "Audit not found" });
    }
    
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).json({ message: "Selected checklist not found" });
    }
    
    // Copy checklist items to answers
    const answers = checklist.items.map(item => ({
      itemId: item._id?.toString() || Math.random().toString(36).substring(7),
      question: item.question,
      category: item.category || "General",
      score: 10,  // start compliant
      maxScore: item.maxScore || 10,
      comment: "",
      severity: "None",
      evidence: ""
    }));
    
    audit.checklistId = checklistId;
    audit.answers = answers;
    audit.auditorId = req.user._id;
    audit.status = "IN_PROGRESS";
    
    await audit.save();
    
    res.status(200).json({
      success: true,
      message: "Checklist started successfully",
      audit
    });
  } catch (error) {
    console.error("Start checklist error:", error);
    res.status(500).json({ message: "Server error while starting audit checklist" });
  }
};

// @route   PUT /api/audits/:id/submit-grades
// @access  Private (Auditor)
export const submitAuditGrades = async (req, res) => {
  try {
    const { answers, isDraft, notes } = req.body;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Checklist answers are required" });
    }
    
    const audit = await Audit.findById(req.params.id);
    if (!audit) {
      return res.status(404).json({ message: "Audit not found" });
    }
    
    // Calculate total score percentage
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    const processedAnswers = answers.map(ans => {
      const score = Number(ans.score) || 0;
      const maxScore = Number(ans.maxScore) || 10;
      totalScore += score;
      maxPossibleScore += maxScore;
      
      return {
        itemId: ans.itemId,
        question: ans.question,
        category: ans.category || "General",
        score,
        maxScore,
        comment: ans.comment || "",
        severity: ans.severity || "None",
        evidence: ans.evidence || ""
      };
    });
    
    const finalScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 100;
    
    audit.answers = processedAnswers;
    audit.score = finalScore;
    audit.notes = notes !== undefined ? notes : audit.notes;
    
    if (isDraft) {
      audit.status = "IN_PROGRESS";
    } else {
      audit.status = "UNDER_REVIEW";
    }
    
    await audit.save();
    
    res.status(200).json({
      success: true,
      message: isDraft ? "Checklist draft saved successfully" : "Checklist submitted for Technical Review",
      audit
    });
  } catch (error) {
    console.error("Submit grades error:", error);
    res.status(500).json({ message: "Server error while submitting audit grading" });
  }
};

// @route   POST /api/audits/:id/review
// @access  Private (Reviewer)
export const reviewAudit = async (req, res) => {
  try {
    const { action, reviewerComments, answers } = req.body;
    
    if (!action || !["APPROVE", "SEND_BACK", "REJECT"].includes(action)) {
      return res.status(400).json({ message: "Action must be APPROVE, SEND_BACK, or REJECT" });
    }
    
    const audit = await Audit.findById(req.params.id);
    if (!audit) {
      return res.status(404).json({ message: "Audit not found" });
    }
    
    audit.reviewerId = req.user._id;
    audit.reviewerComments = reviewerComments || "";
    
    // Optional answers update from reviewer corrections
    if (answers && Array.isArray(answers)) {
      let totalScore = 0;
      let maxPossibleScore = 0;
      
      audit.answers = answers.map(ans => {
        const score = Number(ans.score) || 0;
        const maxScore = Number(ans.maxScore) || 10;
        totalScore += score;
        maxPossibleScore += maxScore;
        
        return {
          itemId: ans.itemId,
          question: ans.question,
          category: ans.category || "General",
          score,
          maxScore,
          comment: ans.comment || "",
          severity: ans.severity || "None",
          evidence: ans.evidence || ""
        };
      });
      
      audit.score = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 100;
    }
    
    if (action === "APPROVE") {
      audit.status = "APPROVED";
      audit.completedDate = new Date();
    } else if (action === "SEND_BACK") {
      audit.status = "IN_PROGRESS"; // Return to auditor's field task index
    } else if (action === "REJECT") {
      audit.status = "REJECTED";
      audit.completedDate = new Date();
    }
    
    await audit.save();
    
    res.status(200).json({
      success: true,
      message: `Audit successfully updated to ${audit.status}`,
      audit
    });
  } catch (error) {
    console.error("Review audit error:", error);
    res.status(500).json({ message: "Server error during audit review process" });
  }
};
