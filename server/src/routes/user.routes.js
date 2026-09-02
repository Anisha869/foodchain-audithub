import { Router } from "express";
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

// Protect all routes - Admin access only
router.use(protect, authorize("admin"));

router.route("/").get(getUsers).post(createUser);

router.route("/:id").put(updateUser);

router.patch("/:id/toggle-status", toggleUserStatus);
router.post("/:id/reset-password", resetUserPassword);

export default router;
