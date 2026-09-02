import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  UserCheck,
  Sparkles,
  Building2,
  ClipboardList,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const DEMO_ROLES = [
  {
    role: "admin",
    name: "Admin / Planner",
    email: "admin@foodchainaudithub.com",
    pass: "Admin@12345",
    icon: ShieldCheck,
    desc: "Full management of users, sites, schedules & standards",
    color: "bg-teal-50 border-teal-200 text-teal-700",
    badge: "bg-teal-100 text-teal-700 border-teal-200"
  },
  {
    role: "auditor",
    name: "Field Auditor",
    email: "auditor@foodchainaudithub.com",
    pass: "Auditor@123",
    icon: ClipboardList,
    desc: "Mobile checklist execution, evidence photos & findings",
    color: "bg-sky-50 border-sky-200 text-sky-700",
    badge: "bg-sky-100 text-sky-700 border-sky-200"
  },
  {
    role: "reviewer",
    name: "Technical Reviewer",
    email: "reviewer@foodchainaudithub.com",
    pass: "Reviewer@123",
    icon: FileCheck2,
    desc: "Review submitted audits, score verification & sign-off",
    color: "bg-violet-50 border-violet-200 text-violet-700",
    badge: "bg-violet-100 text-violet-700 border-violet-200"
  },
  {
    role: "customer",
    name: "Customer / Facility",
    email: "customer@foodchainaudithub.com",
    pass: "Customer@123",
    icon: Building2,
    desc: "View audit reports, CAPA responses & compliance trends",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    badge: "bg-amber-100 text-amber-700 border-amber-200"
  }
];

const Login = () => {
  const { login, homeRouteForRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("signin");
  const [email, setEmail] = useState("admin@foodchainaudithub.com");
  const [password, setPassword] = useState("Admin@12345");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fontSize, setFontSize] = useState("normal");

  // read signup success from query params (after a recent signup)
  const params = new URLSearchParams(location.search);
  const signupSuccess = params.get("signup") === "success";
  const signedRole = params.get("role");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email, password);
      const redirectTo = location.state?.from?.pathname || homeRouteForRole(user.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request
            ? "Unable to reach the API. Check the Netlify VITE_API_BASE_URL setting."
            : "Login failed. Please verify credentials.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
    setSubmitting(true);
    try {
      const user = await login(demoEmail, demoPass);
      const redirectTo = location.state?.from?.pathname || homeRouteForRole(user.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError("Quick demo login failed. Standard admin login is ready below.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen relative overflow-hidden py-10 px-4 bg-slate-50 text-slate-900 ${fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.1),_transparent_22%)]"></div>
      <div className="absolute left-0 top-24 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-slate-900/5 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-slate-50 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex items-center">
          <div className="relative w-full overflow-hidden rounded-[40px] border border-slate-200 bg-gradient-to-br from-emerald-50 to-cyan-50 px-8 py-12 shadow-[0_40px_90px_rgba(15,23,42,0.08)] sm:px-10 sm:py-14">
            <div className="absolute inset-x-4 -top-12 h-40 rounded-full bg-emerald-100/60 blur-3xl" />
            <div className="absolute -left-16 top-12 h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl" />
            <div className="absolute -right-10 bottom-6 h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl" />

            <div className="relative text-slate-950">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/60 px-4 py-2 text-xs font-semibold tracking-[0.3em] text-emerald-700 shadow-sm backdrop-blur">
                <ShieldCheck size={14} />
                AuditHub
              </div>

              {/* Minimal hero: creative visual + short tagline */}
              <div className="mt-8 flex items-center gap-8">
                <div className="flex-1">
                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Second-party auditing</h1>
                  <p className="mt-4 text-sm text-slate-700">Fast inspections. Clear evidence. Trusted sign-off.</p>

                  <div className="mt-6">
                    <Link to="/signup" className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold shadow hover:bg-emerald-700">Get started</Link>
                  </div>
                </div>

                {/* Decorative SVG illustrating inspection / checklist */}
                <div className="w-56 h-56 flex-shrink-0">
                  <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <defs>
                      <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                    <rect x="8" y="8" width="144" height="144" rx="20" fill="url(#g1)" opacity="0.08" />
                    <path d="M44 62h72" stroke="#0369a1" strokeWidth="4" strokeLinecap="round" />
                    <path d="M44 86h72" stroke="#0369a1" strokeWidth="4" strokeLinecap="round" />
                    <path d="M44 110h46" stroke="#0369a1" strokeWidth="4" strokeLinecap="round" />
                    <path d="M28 62l8 8 14-16" stroke="#059669" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="114" cy="116" r="20" fill="#10b981" />
                    <path d="M104 118l6 6 12-12" stroke="#052e16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Subtle callouts, reduced text */}
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[20px] border border-slate-200 bg-white p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Mobile checklists</h3>
                    <p className="text-xs text-slate-500">Fast field capture</p>
                  </div>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
                    <FileCheck2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Reviewer sign-off</h3>
                    <p className="text-xs text-slate-500">Trusted verification</p>
                  </div>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Facility insights</h3>
                    <p className="text-xs text-slate-500">Reports & trends</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex items-center">
          <div className="w-full overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_40px_90px_rgba(15,23,42,0.08)]">
            <div className="rounded-t-[36px] bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 px-8 py-8 sm:px-10 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-100">Secure access</p>
                  <h2 className="mt-3 text-3xl font-extrabold text-white">Sign in to AuditHub</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white border border-white/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-200" /> Atlas live
                </div>
              </div>
            </div>

            <div className="px-8 py-8 sm:px-10 bg-slate-50 border-t border-slate-200">
              <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-8">
                <button
                  type="button"
                  onClick={() => setActiveTab("signin")}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'signin' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`}
                >
                  <UserCheck size={18} />
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("quick-demo")}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'quick-demo' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`}
                >
                  <Sparkles size={18} />
                  1-Click Demo Logins
                </button>
              </div>

              {signupSuccess && (
                <div className="mb-6 rounded-3xl border border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {`Account for "${signedRole || 'user'}" created successfully. Please sign in below.`}
                </div>
              )}

              {error && (
                <div className="mb-6 rounded-3xl border border-rose-600 bg-rose-950/80 p-4 text-sm text-rose-100">
                  {error}
                </div>
              )}

              {activeTab === "signin" && (
                <>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-800">Email Address</label>
                      <div className="relative">
                        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@foodchainaudithub.com"
                          className="w-full rounded-3xl border border-slate-300 bg-white py-3.5 pl-14 pr-4 text-slate-900 placeholder-slate-500 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-slate-800">Password</label>
                      </div>
                      <div className="relative">
                        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-3xl border border-slate-300 bg-white py-3.5 pl-14 pr-14 text-slate-900 placeholder-slate-500 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-3 rounded-3xl bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In to Platform
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-4 text-center text-sm text-slate-600">
                    <p className="mb-2">Don't have an account? Create one for a specific module:</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <Link to="/signup/admin" className="px-3 py-2 rounded-full border bg-white text-slate-700 text-xs">Admin</Link>
                      <Link to="/signup/planner" className="px-3 py-2 rounded-full border bg-white text-slate-700 text-xs">Planner</Link>
                      <Link to="/signup/auditor" className="px-3 py-2 rounded-full border bg-white text-slate-700 text-xs">Auditor</Link>
                      <Link to="/signup/reviewer" className="px-3 py-2 rounded-full border bg-white text-slate-700 text-xs">Reviewer</Link>
                      <Link to="/signup/customer" className="px-3 py-2 rounded-full border bg-white text-slate-700 text-xs">Customer</Link>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "quick-demo" && (
                <div className="space-y-5">
                  <p className="text-sm text-slate-600">Select a role to create an account for that module — signup is required; no automatic demo login.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {DEMO_ROLES.map(({ role, name, email: demoEmail, pass: demoPass, icon: Icon, desc, color, badge }) => (
                      <button
                        key={role}
                        type="button"
                        disabled={submitting}
                        onClick={() => navigate(`/signup/${role}`)}
                        className={`rounded-3xl border px-4 py-5 text-left transition-all duration-200 ${color} ${badge} shadow-sm hover:-translate-y-0.5 hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/90 text-slate-950 shadow-sm">
                              <Icon size={20} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-950">{name}</p>
                              <p className="text-xs text-slate-500">{role}</p>
                            </div>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge}`}>Demo</span>
                        </div>
                        <p className="mt-3 text-xs text-slate-600">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
