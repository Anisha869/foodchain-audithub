import express from "express";
import { verifyRag, askRag } from "../controllers/rag.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/verify", protect, authorize("auditor", "reviewer"), verifyRag);
router.post("/ask", protect, authorize("reviewer"), askRag);

export default router;
