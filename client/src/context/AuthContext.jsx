import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

const ROLE_HOME = {
  admin: "/admin/dashboard",
  planner: "/admin/dashboard",
  auditor: "/auditor/dashboard",
  reviewer: "/reviewer/dashboard",
  customer: "/customer/dashboard",
};

const ALLOWED_ROLES = Object.keys(ROLE_HOME);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(null);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("fah_token");
      const cachedUser = localStorage.getItem("fah_user");

      if (!token) {
        setLoading(false);
        return;
      }

      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          // ignore corrupt cache
        }
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
        localStorage.setItem("fah_user", JSON.stringify(data.user));
      } catch {
        localStorage.removeItem("fah_token");
        localStorage.removeItem("fah_user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Check whether the API is reachable, regardless of the backing store.
    const checkBackend = async () => {
      try {
        const { data } = await api.get("/health");
        setIsBackendConnected(data.status === "ok");
      } catch {
        setIsBackendConnected(false);
      }
    };

    bootstrap();
    checkBackend();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("fah_token", data.token);
    localStorage.setItem("fah_user", JSON.stringify(data.user));
    setUser(data.user);
    setIsBackendConnected(true);
    return data.user;
  };

  const updateCurrentUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("fah_user", JSON.stringify(updatedUser));
  };

  const signup = async ({ name, companyName, email, password, role, phone, setupToken }) => {
    const safeRole = ALLOWED_ROLES.includes(role) ? role : "customer";
    const endpoint = safeRole === "admin"
      ? "/auth/bootstrap-admin"
      : `/auth/signup/${safeRole}`;
    const { data } = await api.post(endpoint, {
      name,
      companyName,
      email,
      password,
      role: safeRole,
      phone,
      setupToken,
    });

    return data;
  };

  const logout = () => {
    localStorage.removeItem("fah_token");
    localStorage.removeItem("fah_user");
    setUser(null);
  };

  const homeRouteForRole = (role) => ROLE_HOME[role] || "/login";

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, updateCurrentUser, isAuthenticated: !!user, homeRouteForRole, isBackendConnected }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export { ROLE_HOME };
