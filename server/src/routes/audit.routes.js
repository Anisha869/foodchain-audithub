import { Router } from "express";
import {
  getAudits,
  getAuditById,
  createAudit,
  startAuditChecklist,
  submitAuditGrades,
  reviewAudit
} from "../controllers/audit.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

// Protect all routes
router.use(protect);

router
  .route("/")
  .get(getAudits)
  .post(authorize("admin", "auditor", "planner"), createAudit);

router.route("/:id").get(getAuditById);

router.post("/:id/start-checklist", authorize("auditor"), startAuditChecklist);
router.put("/:id/submit-grades", authorize("auditor"), submitAuditGrades);
router.post("/:id/review", authorize("reviewer"), reviewAudit);

export default router;
