import dbService from "../services/dbService.js";

/**
 * Finds a user by email using the Supabase database service.
 * Returns { user } or null.
 */
export const findUserByEmail = async (email) => {
  const user = await dbService.findUserByEmail(email);
  return user ? { user } : null;
};

/**
 * Finds a user by id and role.
 */
export const findUserByIdAndRole = async (id, role) => {
  return await dbService.findUserByIdAndRole(id, role);
};

/**
 * Finds a user by id.
 */
export const findUserById = async (id) => {
  return await dbService.findUserById(id);
};

export const getModelByRole = (role) => {
  return {
    async create(data) {
      return await dbService.createUser({ ...data, role });
    },
    async findOne(query) {
      if (query.email) return await dbService.findUserByEmail(query.email);
      if (query.id || query._id) return await dbService.findUserById(query.id || query._id);
      return null;
    },
    async findById(id) {
      return await dbService.findUserById(id);
    },
    async find(filter = {}) {
      return await dbService.getUsers({ ...filter, role });
    },
  };
};

export const ALL_ROLE_MODELS = ["admin", "planner", "auditor", "reviewer", "customer"].map(getModelByRole);

export default {
  findUserByEmail,
  findUserByIdAndRole,
  findUserById,
  getModelByRole,
  ALL_ROLE_MODELS,
};
