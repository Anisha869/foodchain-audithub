import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

const ROLE_HOME = {
  admin: "/admin/dashboard",
  auditor: "/auditor/dashboard",
  reviewer: "/reviewer/dashboard",
  customer: "/customer/dashboard",
};

const DEFAULT_DEMO_USERS = [
  {
    id: "demo-admin",
    name: "System Administrator",
    email: "admin@foodchainaudithub.com",
    password: "Admin@12345",
    role: "admin",
  },
  {
    id: "demo-planner",
    name: "Audit Planner",
    email: "planner@foodchainaudithub.com",
    password: "Planner@123",
    role: "admin",
  },
  {
    id: "demo-auditor",
    name: "Field Auditor",
    email: "auditor@foodchainaudithub.com",
    password: "Auditor@123",
    role: "auditor",
  },
  {
    id: "demo-reviewer",
    name: "Technical Reviewer",
    email: "reviewer@foodchainaudithub.com",
    password: "Reviewer@123",
    role: "reviewer",
  },
  {
    id: "demo-customer",
    name: "Facility Customer",
    email: "customer@foodchainaudithub.com",
    password: "Customer@123",
    role: "customer",
  },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(null);

  const getLocalUsers = () => {
    try {
      return JSON.parse(localStorage.getItem("fah_local_users") || "[]");
    } catch {
      return [];
    }
  };

  const saveLocalUser = (newUser) => {
    try {
      const existing = getLocalUsers();
      const filtered = existing.filter(
        (u) => u.email.toLowerCase() !== newUser.email.toLowerCase()
      );
      filtered.push(newUser);
      localStorage.setItem("fah_local_users", JSON.stringify(filtered));
    } catch (e) {
      console.error("Failed to save local user", e);
    }
  };

  const findFallbackUser = (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const allUsers = [...DEFAULT_DEMO_USERS, ...getLocalUsers()];
    const found = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      return { error: "Invalid email or password" };
    }

    if (found.password && found.password !== password) {
      return { error: "Invalid email or password" };
    }

    return {
      user: {
        id: found.id || found._id || "local-" + Date.now(),
        name: found.name,
        email: found.email,
        role: found.role,
        isDemo: true,
      },
    };
  };

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("fah_token");
      const cachedUser = localStorage.getItem("fah_user");

      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          // ignore corrupt cache
        }
      }

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
        localStorage.setItem("fah_user", JSON.stringify(data.user));
        setIsBackendConnected(true);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("fah_token");
          localStorage.removeItem("fah_user");
          setUser(null);
        } else {
          // Network error or offline: retain local user session
          setIsBackendConnected(false);
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("fah_token", data.token);
      localStorage.setItem("fah_user", JSON.stringify(data.user));
      setUser(data.user);
      setIsBackendConnected(true);
      return data.user;
    } catch (err) {
      if (err.response && err.response.status < 500) {
        throw err;
      }

      // Backend API unreachable / Netlify standalone preview mode
      setIsBackendConnected(false);
      const fallback = findFallbackUser(email, password);
      if (fallback.error) {
        const customErr = new Error(fallback.error);
        customErr.response = { data: { message: fallback.error } };
        throw customErr;
      }

      const mockToken = "demo-jwt-token-" + Date.now();
      localStorage.setItem("fah_token", mockToken);
      localStorage.setItem("fah_user", JSON.stringify(fallback.user));
      setUser(fallback.user);
      return fallback.user;
    }
  };

  const signup = async ({ name, email, password, role, phone }) => {
    const newUser = {
      id: "user-" + Date.now(),
      name,
      email: email.trim().toLowerCase(),
      password,
      role: role || "customer",
      phone,
    };

    try {
      const { data } = await api.post(`/auth/signup/${role}`, { name, email, password, phone });
      setIsBackendConnected(true);
      return data;
    } catch (err) {
      if (err.response && err.response.status < 500) {
        throw err;
      }

      setIsBackendConnected(false);
      saveLocalUser(newUser);
      return { message: "Local account created successfully", user: newUser };
    }
  };

  const logout = () => {
    localStorage.removeItem("fah_token");
    localStorage.removeItem("fah_user");
    setUser(null);
  };

  const homeRouteForRole = (role) => ROLE_HOME[role] || "/login";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        homeRouteForRole,
        isBackendConnected,
      }}
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

