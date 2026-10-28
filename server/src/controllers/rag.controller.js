import { verifyAuditWithRag, askRagBot } from "../services/ragService.js";
import dbService from "../services/dbService.js";

const MAX_TOP_K = 10;

const getAuditReportContext = async (auditId, req, res) => {
  if (!auditId) {
    res.status(400).json({ message: "Audit ID is required" });
    return null;
  }

  const audit = await dbService.getAuditById(auditId);
  if (!audit) {
    res.status(404).json({ message: "Audit not found" });
    return null;
  }
  if (req.user.role === "auditor") {
    const auditorId = audit.auditorId?._id || audit.auditorId?.id || audit.auditorId;
    if (auditorId?.toString() !== (req.user._id || req.user.id).toString()) {
      res.status(403).json({ message: "This audit is assigned to another auditor" });
      return null;
    }
    if (!["IN_PROGRESS", "UNDER_REVIEW"].includes(audit.status)) {
      res.status(409).json({ message: "VERA analysis is available only for an active audit" });
      return null;
    }
  } else if (audit.status !== "UNDER_REVIEW") {
    res.status(409).json({ message: "VERA analysis is available only while an audit is under review" });
    return null;
  }

  const answers = Array.isArray(audit.answers) ? audit.answers : [];
  const checklist = audit.checklistId?.items?.length
    ? audit.checklistId.items
    : answers.map((answer) => ({
        itemId: answer.itemId,
        question: answer.question,
        category: answer.category,
        maxScore: answer.maxScore,
        asterisk_critical: answer.asterisk_critical || answer.asteriskCritical,
      }));

  if (checklist.length === 0 || answers.length === 0) {
    res.status(400).json({ message: "The audit needs checklist answers before VERA can analyze it" });
    return null;
  }

  const reportText = [
    audit.notes ? `Audit Scope & Facility Notes: ${audit.notes}` : "",
    ...answers.map((answer, idx) => {
      const maxScore = Number(answer.maxScore) || 10;
      const score = Number(answer.score);
      const isPass = score === maxScore;
      const isFail = score === 0;

      let scoreVerdict = "";
      if (isPass) {
        scoreVerdict = "Compliant. Verified requirement fully satisfied and maintained on-site.";
      } else if (isFail) {
        scoreVerdict = "Non-compliant deficiency noted. Violation observed, requirement not maintained or missing.";
      } else if (!isNaN(score)) {
        scoreVerdict = `Partially compliant. Procedural gaps noted with partial implementation (Score: ${score}/${maxScore}).`;
      } else {
        scoreVerdict = "Audit verification in progress.";
      }

      const details = [
        `[Item ${idx + 1} - ${answer.category || "General"}] Requirement: ${answer.question}.`,
        `Evaluation: ${scoreVerdict}`,
        answer.comment ? `Auditor observation: ${answer.comment}.` : "",
        answer.evidence ? `Supporting Evidence: ${answer.evidence}.` : "",
      ];
      return details.filter(Boolean).join(" ");
    }),
  ].filter(Boolean).join("\n");

  const questionContext = answers.map((answer, idx) => {
    const details = [
      `[${idx + 1}] ${answer.category || "General"}: ${answer.question}`,
      `Score: ${answer.score ?? "unscored"}/${answer.maxScore ?? 10}`,
      answer.comment ? `Auditor notes: ${answer.comment}` : "",
      answer.evidence ? `Evidence: ${answer.evidence}` : "",
    ];
    return details.filter(Boolean).join(". ");
  }).join("\n");

  return { audit, checklist, reportText, questionContext };
};

const getTopK = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_TOP_K) : 4;
};

/**
 * Run advisory VERA analysis for an audit under reviewer assessment.
 * This never changes audit answers or scores.
 */
export const verifyRag = async (req, res) => {
  try {
    const context = await getAuditReportContext(req.body.auditId, req, res);
    if (!context) return;

    if (req.body.engine && !["rag", "nlp", "compare", "okf", "nli"].includes(req.body.engine)) {
      return res.status(400).json({ message: "Choose a supported VERA evaluation engine" });
    }
    const engine = ["rag", "nlp", "compare", "okf", "nli"].includes(req.body.engine)
      ? req.body.engine
      : "rag";
    const analysisResult = await verifyAuditWithRag(
      context.checklist,
      context.reportText,
      getTopK(req.body.topK),
      engine
    );

    if (analysisResult.available === false) {
      return res.status(503).json({
        message: analysisResult.message,
        engine: analysisResult.engine,
      });
    }

    const engineResults = engine === "compare"
      ? analysisResult.engines
      : { [engine]: analysisResult };
    const updatedAnswers = context.audit.answers.map((answer) => {
      const itemId = String(answer.itemId || "");
      const veraAnalysis = { ...(answer.veraAnalysis || {}) };
      for (const [engineName, result] of Object.entries(engineResults)) {
        const verdict = result.verdicts?.[itemId];
        if (!verdict) continue;
        veraAnalysis[engineName] = {
          generatedAt: new Date().toISOString(),
          verdict,
          explanation: result.explanations?.[itemId] || null,
        };
      }
      if (engine === "compare") {
        veraAnalysis.disagreement = analysisResult.disagreements.some(
          (item) => item.item_id === itemId
        );
      }
      return { ...answer, veraAnalysis };
    });
    const updatedAudit = await dbService.updateAudit(
      context.audit._id || context.audit.id,
      { answers: updatedAnswers }
    );

    res.status(200).json({
      success: true,
      data: analysisResult,
      audit: updatedAudit,
      advisory: "VERA results are saved with the audit answers for traceability. Treat them as advisory; a human reviewer must verify all findings.",
    });
  } catch (error) {
    console.error("VERA RAG verification error:", error);
    res.status(500).json({ message: "VERA RAG verification failed", error: error.message });
  }
};

/**
 * Ask extractive questions about an audit currently under reviewer assessment.
 */
export const askRag = async (req, res) => {
  try {
    const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const context = await getAuditReportContext(req.body.auditId, req, res);
    if (!context) return;

    const result = await askRagBot(question, context.questionContext, getTopK(req.body.topK));
    res.status(200).json({
      success: true,
      answer: result.answer,
      advisory: "Answer excerpts are retrieved from this audit's recorded observations and evidence.",
    });
  } catch (error) {
    console.error("VERA RAG Ask error:", error);
    res.status(500).json({ message: "VERA RAG Ask failed", error: error.message });
  }
};
