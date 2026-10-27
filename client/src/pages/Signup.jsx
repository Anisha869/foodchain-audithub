import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "auditor", label: "Auditor" },
  { value: "planner", label: "Audit Planner" },
  { value: "reviewer", label: "Technical Reviewer" },
  { value: "admin", label: "Administrator (first account only)" },
];

const Signup = () => {
  const { role: routeRole } = useParams();
  const [role, setRole] = useState(ROLE_OPTIONS.some((option) => option.value === routeRole) ? routeRole : "customer");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { signup } = useAuth();

  useEffect(() => {
    if (ROLE_OPTIONS.some((option) => option.value === routeRole)) {
      setRole(routeRole);
    }
  }, [routeRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Enter your name and email, and use a password with at least 8 characters.");
      return;
    }
    if (role === "customer" && !companyName.trim()) {
      setError("Company or facility name is required for customer signup.");
      return;
    }
    if (role === "admin" && !setupToken.trim()) {
      setError("The one-time administrator setup token is required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signup({ name, companyName, email, password, role, phone, setupToken });
      const pending = result.pendingApproval ? "&pending=true" : "";
      navigate(`/login?signup=success&role=${encodeURIComponent(role)}${pending}`, { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || (
        err.code === "ERR_NETWORK"
          ? `Cannot reach the backend API at ${api.defaults.baseURL}. Check that the API is running and that your browser can reach it. The API will not start if its configured Supabase database is unreachable.`
          : err.message || "Signup failed"
      );
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h2 className="text-2xl font-bold mb-3 text-slate-900">Create an account</h2>
        <p className="text-sm text-slate-600 mb-4">Your account is stored in the configured Supabase project. Signup will not sign you in automatically.</p>

        {error && <div className="mb-4 text-sm text-rose-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Account type</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900"
            >
              {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm" />
          </div>

          {role === "customer" && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Company / facility</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm" />
          </div>

          {role === "admin" && (
            <div>
              <label className="block text-sm font-medium text-slate-700">One-time administrator setup token</label>
              <input type="password" value={setupToken} onChange={(e) => setSetupToken(e.target.value)} required className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900" />
              <p className="mt-1 text-xs text-slate-500">Set ADMIN_BOOTSTRAP_TOKEN on the API host. This works only before the first administrator exists.</p>
            </div>
          )}

          {["auditor", "planner", "reviewer"].includes(role) && (
            <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
              Staff access remains disabled until an administrator approves this request.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm" />
          </div>

          <div className="flex items-center justify-between">
            <Link to="/login" className="text-sm text-slate-500">Back to sign in</Link>
            <button type="submit" disabled={submitting} className="bg-emerald-600 text-white px-4 py-2 rounded-md shadow hover:bg-emerald-700">
              {submitting ? "Creating..." : role === "admin" ? "Set up first administrator" : `Create ${role} account`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
