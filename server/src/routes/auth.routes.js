import { Router } from "express";
import { login, getMe, updateProfile, registerUser, signupRole, bootstrapFirstAdmin } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

// Admin-only user creation (full User Management UI arrives in Phase 3)
router.post("/register", protect, authorize("admin"), registerUser);

// Customers are active immediately; staff signups remain pending until an admin approves.
router.post("/signup/:role", signupRole);
router.post("/bootstrap-admin", bootstrapFirstAdmin);

export default router;
