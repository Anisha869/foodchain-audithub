import { Router } from "express";
import multer from "multer";
import {
  uploadChecklist,
  getChecklists,
  getChecklistById,
  deleteChecklist
} from "../controllers/checklist.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

const router = Router();

// Protect all routes
router.use(protect);

router
  .route("/")
  .get(getChecklists)
  .post(authorize("customer", "admin"), upload.single("file"), uploadChecklist);

router
  .route("/:id")
  .get(getChecklistById)
  .delete(authorize("customer", "admin"), deleteChecklist);

export default router;
