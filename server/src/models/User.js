import Admin from "./Admin.js";

/**
 * Legacy User model export fallback.
 * Points to Admin or primary role models.
 */
export default Admin;
export const ROLES = ["admin", "planner", "auditor", "reviewer", "customer"];
