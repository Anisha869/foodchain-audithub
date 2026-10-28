import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  FileSpreadsheet, 
  Lock, 
  FileCheck,
  Building2,
  Cpu
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          FSSAI Schedule 4 / Annex 5 Second-Party Audit Verification
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          Deterministic Regulatory Compliance for{" "}
          <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
            Food Establishments
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          VERA Customer PWA connects your facilities with certified food safety auditors. Request inspections, track verification progress in real-time, and download legally tamper-evident audit dossiers.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            Open Customer Dashboard <ArrowRight size={16} />
          </Link>
          <Link
            href="/checklists"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            Inspect Official Checklists
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">8 Statutory Sectors</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Official Annex 5 checklists for General Manufacturing, Milk, Meat, Catering, Slaughterhouses, Retail, Storage, and Transport.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Zero-Hallucination AI</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Powered by VERA’s 4-engine suite including OKF Knowledge Graph traversal and Deep Learning NLI with strict human expert oversight.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Tamper-Proof Provenance</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            SHA-256 session provenance seals all released reports. Overrides require mandatory regulatory justification.
          </p>
        </div>
      </section>

      {/* Workflow Steps */}
      <section className="bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">The VERA Auditing Journey</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Seamless multi-stakeholder governance from request submission to official report release.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-black text-blue-600">STAGE 1</span>
            <h4 className="font-bold text-slate-900 dark:text-white">Audit Request</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Customer selects facility and statutory checklist category.</p>
          </div>
          <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-black text-indigo-600">STAGE 2</span>
            <h4 className="font-bold text-slate-900 dark:text-white">Auditor Assignment</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Admin validates facility scope and assigns certified lead auditor.</p>
          </div>
          <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-black text-purple-600">STAGE 3-4</span>
            <h4 className="font-bold text-slate-900 dark:text-white">AI Verification & Overrides</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Document extraction, 4-engine verification, forensic risk signals, and auditor corrections.</p>
          </div>
          <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-black text-emerald-600">STAGE 5-6</span>
            <h4 className="font-bold text-slate-900 dark:text-white">Expert Review & Release</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Expert reviewer approves audit dossier. Tamper-proof certificate is released to customer.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
