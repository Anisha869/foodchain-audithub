import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import { useAuth } from "./context/AuthContext.jsx";

import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AuditorDashboard from "./pages/auditor/AuditorDashboard.jsx";
import ReviewerDashboard from "./pages/reviewer/ReviewerDashboard.jsx";
import CustomerDashboard from "./pages/customer/CustomerDashboard.jsx";

const RootRedirect = () => {
  const { user, loading, homeRouteForRole } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? homeRouteForRole(user.role) : "/login"} replace />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup/:role" element={<Signup />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* Auditor */}
      <Route element={<ProtectedRoute allowedRoles={["auditor"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/auditor/dashboard" element={<AuditorDashboard />} />
        </Route>
      </Route>

      {/* Technical Reviewer */}
      <Route element={<ProtectedRoute allowedRoles={["reviewer"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
        </Route>
      </Route>

      {/* Customer */}
      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
