import Admin from "../models/Admin.js";
import Planner from "../models/Planner.js";
import Auditor from "../models/Auditor.js";
import Reviewer from "../models/Reviewer.js";
import CustomerUser from "../models/CustomerUser.js";

/**
 * Maps a role string to its Mongoose model.
 */
const ROLE_MODEL_MAP = {
  admin: Admin,
  planner: Planner,
  auditor: Auditor,
  reviewer: Reviewer,
  customer: CustomerUser,
};

/** All role models in an array (useful for cross-collection queries). */
export const ALL_ROLE_MODELS = Object.values(ROLE_MODEL_MAP);

/**
 * Get the Mongoose model for a given role string.
 * @param {string} role
 * @returns {import("mongoose").Model | undefined}
 */
export const getModelByRole = (role) => ROLE_MODEL_MAP[role];

/**
 * Find a user by email across ALL role collections (parallelized for speed).
 * Returns { user, Model } or null.
 * Selects +password so login can compare hashes.
 */
export const findUserByEmail = async (email) => {
  const normalised = email.toLowerCase().trim();
  const entries = Object.entries(ROLE_MODEL_MAP);

  const results = await Promise.all(
    entries.map(async ([role, Model]) => {
      const user = await Model.findOne({ email: normalised }).select("+password");
      return user ? { user, Model } : null;
    })
  );

  return results.find((res) => res !== null) || null;
};

/**
 * Find a user by _id in a specific role collection.
 */
export const findUserByIdAndRole = async (id, role) => {
  const Model = ROLE_MODEL_MAP[role];
  if (!Model) return null;
  return Model.findById(id);
};

/**
 * Find a user by _id across ALL role collections (parallelized for speed).
 */
export const findUserById = async (id) => {
  const results = await Promise.all(
    ALL_ROLE_MODELS.map(async (Model) => {
      return await Model.findById(id);
    })
  );
  return results.find((u) => u !== null) || null;
};

export default ROLE_MODEL_MAP;
