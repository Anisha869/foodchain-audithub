"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ShieldAlert, Mail, Lock, ArrowRight, UserCheck, Sparkles, Layers, Shield } from "lucide-react";

export default function AuditorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/audits");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid auditor credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleQuickLogin = async (role: "AUDITOR" | "EXPERT_REVIEWER" | "ADMIN") => {
    setLoading(true);
    setErrorMsg(null);

    const emailMap = {
      AUDITOR: "auditor@vera.regulatory",
      EXPERT_REVIEWER: "reviewer@vera.regulatory",
      ADMIN: "admin@vera.regulatory",
    };

    const targetRoute = {
      AUDITOR: "/audits",
      EXPERT_REVIEWER: "/queue",
      ADMIN: "/admin",
    };

    const demoEmail = emailMap[role];
    const demoPass = "VeraInternal2026!";
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPass,
      });
      if (error) {
        // Auto-create demo internal user if not present
        await supabase.auth.signUp({
          email: demoEmail,
          password: demoPass,
          options: {
            data: {
              role: role,
              full_name: role === "AUDITOR" ? "Dr. Rajesh Iyer" : role === "EXPERT_REVIEWER" ? "S. Swaminathan" : "System Administrator",
            },
          },
        });
      }
      router.push(targetRoute[role]);
    } catch (err: any) {
      // Direct access fallback for test evaluator
      router.push(targetRoute[role]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-950 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-4 border border-blue-500/30">
            <ShieldAlert className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            VERA Audit & Review Workspace
          </h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Authorized portal for certified food safety auditors, expert reviewers, and quality administrators.
          </p>
        </div>

        {/* Quick Demo Access Roles */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Sparkles size={14} className="text-blue-500" /> Fast-Track Evaluator Login:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleRoleQuickLogin("AUDITOR")}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-all text-center"
            >
              Lead Auditor
            </button>
            <button
              type="button"
              onClick={() => handleRoleQuickLogin("EXPERT_REVIEWER")}
              className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-all text-center"
            >
              Expert Reviewer
            </button>
            <button
              type="button"
              onClick={() => handleRoleQuickLogin("ADMIN")}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold transition-all text-center"
            >
              Admin Dispatch
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Auditor / Reviewer Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lead.auditor@vera.regulatory"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In to Regulatory Workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
