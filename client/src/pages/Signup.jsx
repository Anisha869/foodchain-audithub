import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const AVAILABLE_ROLES = ["admin", "planner", "auditor", "reviewer", "customer"];

const Signup = () => {
  const { role: roleParam } = useParams();
  const [role, setRole] = useState(roleParam || "customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("Please fill name, email and password");
      return;
    }

    setSubmitting(true);
    try {
      await signup({ name, email, password, role, phone });
      navigate(`/login?signup=success&role=${encodeURIComponent(role)}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h2 className="text-2xl font-bold mb-3 text-slate-900">Create account</h2>
        <p className="text-sm text-slate-600 mb-4">Select a role and create an account for that module.</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm">
            {AVAILABLE_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {error && <div className="mb-4 text-sm text-rose-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm" />
          </div>

          <div className="flex items-center justify-between">
            <Link to="/login" className="text-sm text-slate-500">Back to sign in</Link>
            <button type="submit" disabled={submitting} className="bg-emerald-600 text-white px-4 py-2 rounded-md shadow hover:bg-emerald-700">
              {submitting ? "Creating..." : `Create ${role} account`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
