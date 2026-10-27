import dbService from "../services/dbService.js";

const sanitizeCustomerAudit = (audit) => ({
  ...audit,
  reviewerComments: "",
  score: audit.status === "APPROVED" ? audit.score : null,
  answers: audit.status === "APPROVED"
    ? (audit.answers || []).map(({ veraAnalysis, ...answer }) => answer)
    : [],
});

// @route   GET /api/audits
// @access  Private (Admin, Auditor, Reviewer, Customer)
export const getAudits = async (req, res) => {
  try {
    const filter = {};
    
    if (req.user.role === "customer") {
      const customerId = req.user.customerId;
      if (!customerId) {
        return res.status(400).json({ message: "This account is not linked to a customer facility. Contact an administrator." });
      }
      filter.customerId = customerId;
    } else if (req.user.role === "auditor") {
      filter.auditorId = req.user._id || req.user.id;
    }
    
    const records = await dbService.getAudits(filter);
    const audits = req.user.role === "customer"
      ? records.map(sanitizeCustomerAudit)
      : records;
      
    res.status(200).json({
      success: true,
      count: audits.length,
      audits,
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
    const audit = await dbService.getAuditById(req.params.id);
      
    if (!audit) {
      return res.status(404).json({ message: "Audit not found" });
    }
    
    // Access control for customer
    const custId = audit.customerId?._id || audit.customerId?.id || audit.customerId;
    const userCustId = req.user.customerId?._id || req.user.customerId;
    if (req.user.role === "customer" && custId?.toString() !== userCustId?.toString()) {
      return res.status(403).json({ message: "Not authorized to access this audit report" });
    }

    const visibleAudit = req.user.role === "customer"
      ? sanitizeCustomerAudit(audit)
      : audit;
    
    res.status(200).json({
      success: true,
      audit: visibleAudit,
    });
  } catch (error) {
    console.error("Get audit error:", error.message);
    res.status(500).json({ message: "Server error while fetching audit details" });
  }
};

// @route   POST /api/audits
// @access  Private (Admin, Auditor, Planner)
export const createAudit = async (req, res) => {
  try {
    const { customerId, siteId, standard, scheduledDate, notes, checklistId, auditorId: bodyAuditorId } = req.body;
    
    let targetCustId = customerId;
    if (!targetCustId) {
      const customers = await dbService.getCustomers();
      if (customers.length > 0) {
        targetCustId = customers[0]._id || customers[0].id;
      } else {
        const cust = await dbService.createCustomer({
          companyName: "FoodChain Standard Client",
          code: "FCSC",
          contactPerson: "QA Desk",
          email: "client@foodchainaudithub.com",
          isActive: true,
        });
        targetCustId = cust._id || cust.id;
      }
    }

    let targetSiteId = siteId;
    if (!targetSiteId) {
      const sites = await dbService.getSites(targetCustId);
      if (sites.length > 0) {
        targetSiteId = sites[0]._id || sites[0].id;
      } else {
        const site = await dbService.createSite({
          customerId: targetCustId,
          siteName: "Central Processing Facility",
          siteCode: "CPF-01",
          address: "100 Quality Way, Industrial Zone",
          city: "Metropolis",
          state: "State HQ",
          isActive: true,
        });
        targetSiteId = site._id || site.id;
      }
    }

    const scheduledDateVal = scheduledDate || new Date();
    
    // Unique audit ref
    const refPrefix = standard ? standard.substring(0, 4).toUpperCase() : "AUD";
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const auditRef = `${refPrefix}-${randNum}`;
    
    let auditorId = bodyAuditorId || null;
    if (!auditorId && req.user.role === "auditor") {
      auditorId = req.user._id || req.user.id;
    }

    let answers = [];
    let status = "SCHEDULED";
    let linkedChecklistId = null;

    if (checklistId) {
      const checklist = await dbService.getChecklistById(checklistId);
      if (checklist && checklist.items && checklist.items.length > 0) {
        linkedChecklistId = checklist._id || checklist.id;
        status = "IN_PROGRESS";
        answers = checklist.items.map((item, idx) => ({
          itemId: item._id?.toString() || item.id?.toString() || String(idx + 1),
          question: item.question,
          category: item.category || "General",
          score: 10,
          maxScore: item.maxScore || 10,
          comment: "",
          severity: "None",
          evidence: "",
        }));
      }
    }
    
    const audit = await dbService.createAudit({
      auditRef,
      customerId: targetCustId,
      siteId: targetSiteId,
      auditorId,
      standard: standard || "FSSAI",
      scheduledDate: scheduledDateVal,
      status,
      checklistId: linkedChecklistId,
      answers,
      notes,
    });
    
    res.status(201).json({
      success: true,
      message: "Audit scheduled successfully",
      audit,
    });
  } catch (error) {
    console.error("Create audit error:", error.message);
    res.status(500).json({ message: "Server error while scheduling audit" });
  }
};

// @route   PUT /api/audits/:id
// @access  Private (Admin, Auditor, Planner)
export const updateAudit = async (req, res) => {
  try {
    const { customerId, siteId, auditorId, reviewerId, standard, scheduledDate, status, notes } = req.body;
    
    const existing = await dbService.getAuditById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Audit not found" });
    }
    
    const updates = {};
    if (customerId) updates.customerId = customerId;
    if (siteId) updates.siteId = siteId;
    if (auditorId !== undefined) updates.auditorId = auditorId || null;
    if (reviewerId !== undefined) updates.reviewerId = reviewerId || null;
    if (standard) updates.standard = standard;
    if (scheduledDate) updates.scheduledDate = scheduledDate;
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    
    const updatedAudit = await dbService.updateAudit(req.params.id, updates);

    res.status(200).json({
      success: true,
      message: "Audit updated successfully",
      audit: updatedAudit,
    });
  } catch (error) {
    console.error("Update audit error:", error.message);
    res.status(500).json({ message: "Server error while updating audit" });
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
    
    const audit = await dbService.getAuditById(req.params.id);
    if (!audit) {
      return res.status(404).json({ message: "Audit not found" });
    }
    const currentAuditorId = (req.user._id || req.user.id).toString();
    const assignedAuditorId = audit.auditorId?._id || audit.auditorId?.id || audit.auditorId;
    if (assignedAuditorId && assignedAuditorId.toString() !== currentAuditorId) {
      return res.status(403).json({ message: "This audit is assigned to another auditor" });
    }
    if (!["SCHEDULED", "IN_PROGRESS"].includes(audit.status)) {
      return res.status(409).json({ message: "This audit can no longer be started" });
    }
    
    const checklist = await dbService.getChecklistById(checklistId);
    if (!checklist) {
      return res.status(404).json({ message: "Selected checklist not found" });
    }
    
    // Copy checklist items to answers
    const answers = (checklist.items || []).map((item, idx) => ({
      itemId: item._id?.toString() || item.id?.toString() || String(idx + 1),
      question: item.question,
      category: item.category || "General",
      score: 10,  // start compliant
      maxScore: item.maxScore || 10,
      comment: "",
      severity: "None",
      evidence: "",
    }));
    
    const updated = await dbService.updateAudit(req.params.id, {
      checklistId,
      answers,
      auditorId: req.user._id || req.user.id,
      status: "IN_PROGRESS",
    });
    
    res.status(200).json({
      success: true,
      message: "Checklist started successfully",
      audit: updated,
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
    
    const audit = await dbService.getAuditById(req.params.id);
    if (!audit) {
      return res.status(404).json({ message: "Audit not found" });
    }
    const currentAuditorId = (req.user._id || req.user.id).toString();
    const assignedAuditorId = audit.auditorId?._id || audit.auditorId?.id || audit.auditorId;
    if (assignedAuditorId?.toString() !== currentAuditorId) {
      return res.status(403).json({ message: "This audit is assigned to another auditor" });
    }
    if (audit.status !== "IN_PROGRESS") {
      return res.status(409).json({ message: "Only an in-progress audit can be submitted" });
    }
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    const processedAnswers = answers.map((ans, idx) => {
      const score = Number(ans.score) || 0;
      const maxScore = Number(ans.maxScore) || 10;
      totalScore += score;
      maxPossibleScore += maxScore;
      
      return {
        itemId: ans.itemId || String(idx + 1),
        question: ans.question,
        category: ans.category || "General",
        score,
        maxScore,
        comment: ans.comment || "",
        severity: ans.severity || "None",
        evidence: ans.evidence || "",
        ...(ans.veraAnalysis ? { veraAnalysis: ans.veraAnalysis } : {}),
      };
    });
    
    const finalScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 100;
    
    const updated = await dbService.updateAudit(req.params.id, {
      answers: processedAnswers,
      score: finalScore,
      notes: notes !== undefined ? notes : audit.notes,
      status: isDraft ? "IN_PROGRESS" : "UNDER_REVIEW",
    });
    
    res.status(200).json({
      success: true,
      message: isDraft ? "Checklist draft saved successfully" : "Checklist submitted for Technical Review",
      audit: updated,
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
    
    const audit = await dbService.getAuditById(req.params.id);
    if (!audit) {
      return res.status(404).json({ message: "Audit not found" });
    }
    if (audit.status !== "UNDER_REVIEW") {
      return res.status(409).json({ message: "Only audits submitted for review can receive a decision" });
    }
    
    const updates = {
      reviewerId: req.user._id || req.user.id,
      reviewerComments: reviewerComments || "",
    };
    
    if (answers && Array.isArray(answers)) {
      let totalScore = 0;
      let maxPossibleScore = 0;
      
      updates.answers = answers.map((ans, idx) => {
        const score = Number(ans.score) || 0;
        const maxScore = Number(ans.maxScore) || 10;
        totalScore += score;
        maxPossibleScore += maxScore;
        
        return {
          itemId: ans.itemId || String(idx + 1),
          question: ans.question,
          category: ans.category || "General",
          score,
          maxScore,
          comment: ans.comment || "",
          severity: ans.severity || "None",
          evidence: ans.evidence || "",
          ...(ans.veraAnalysis ? { veraAnalysis: ans.veraAnalysis } : {}),
        };
      });
      
      updates.score = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 100;
    }
    
    if (action === "APPROVE") {
      updates.status = "APPROVED";
      updates.completedDate = new Date();
    } else if (action === "SEND_BACK") {
      updates.status = "IN_PROGRESS";
    } else if (action === "REJECT") {
      updates.status = "REJECTED";
      updates.completedDate = new Date();
    }
    
    const updated = await dbService.updateAudit(req.params.id, updates);
    
    res.status(200).json({
      success: true,
      message: `Audit successfully updated to ${updated.status}`,
      audit: updated,
    });
  } catch (error) {
    console.error("Review audit error:", error);
    res.status(500).json({ message: "Server error during audit review process" });
  }
};
