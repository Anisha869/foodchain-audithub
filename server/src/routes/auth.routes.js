import { Router } from "express";
import { login, getMe, updateProfile, registerUser, signupRole } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

// Admin-only user creation (full User Management UI arrives in Phase 3)
router.post("/register", protect, authorize("admin"), registerUser);

// Public signup by role (e.g. POST /api/auth/signup/customer)
// NOTE: This endpoint allows self-registration for any of the allowed roles.
router.post("/signup/:role", signupRole);

export default router;
