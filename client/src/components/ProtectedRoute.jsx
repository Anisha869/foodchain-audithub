import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Wraps a section of routes. Redirects to /login if not authenticated.
 * If `allowedRoles` is provided, also enforces RBAC — a user whose role
 * isn't in the list is redirected to their own dashboard instead.
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading, homeRouteForRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeRouteForRole(user.role)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
