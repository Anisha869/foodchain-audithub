import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

const ROLE_HOME = {
  admin: "/admin/dashboard",
  auditor: "/auditor/dashboard",
  reviewer: "/reviewer/dashboard",
  customer: "/customer/dashboard",
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we validate an existing token

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("fah_token");
      const cachedUser = localStorage.getItem("fah_user");

      if (!token) {
        setLoading(false);
        return;
      }

      // Optimistically restore from cache, then verify with the server
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

    bootstrap();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("fah_token", data.token);
    localStorage.setItem("fah_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("fah_token");
    localStorage.removeItem("fah_user");
    setUser(null);
  };

  const homeRouteForRole = (role) => ROLE_HOME[role] || "/login";

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, isAuthenticated: !!user, homeRouteForRole }}
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
