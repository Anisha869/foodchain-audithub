import Admin from "./Admin.js";

/**
 * Legacy import alias for Admin. User accounts are stored in their role-specific
 * collections; /api/users aggregates those collections and does not use `users`.
 */
export default Admin;
export const ROLES = ["admin", "planner", "auditor", "reviewer", "customer"];
