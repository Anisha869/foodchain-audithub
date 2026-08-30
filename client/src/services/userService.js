import api from "./api.js";

export const getUsers = async (params) => {
  const { data } = await api.get("/users", { params });
  return data;
};

export const createUser = async (userData) => {
  const { data } = await api.post("/users", userData);
  return data;
};

export const updateUser = async (id, userData) => {
  const { data } = await api.put(`/users/${id}`, userData);
  return data;
};

export const toggleUserStatus = async (id) => {
  const { data } = await api.patch(`/users/${id}/toggle-status`);
  return data;
};

export const resetUserPassword = async (id, newPassword) => {
  const { data } = await api.post(`/users/${id}/reset-password`, { newPassword });
  return data;
};
