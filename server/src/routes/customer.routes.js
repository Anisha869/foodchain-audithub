import { Router } from "express";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  getCustomerSites,
  createCustomerSite,
} from "../controllers/customer.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.use(protect);

router
  .route("/")
  .get(getCustomers)
  .post(authorize("admin"), createCustomer);

router
  .route("/:id")
  .get(getCustomerById)
  .put(authorize("admin"), updateCustomer);

router
  .route("/:id/sites")
  .get(getCustomerSites)
  .post(authorize("admin"), createCustomerSite);

export default router;
