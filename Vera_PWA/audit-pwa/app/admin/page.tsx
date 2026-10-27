"use client";

import { useState } from "react";
import { 
  Settings, 
  UserCheck, 
  Cpu, 
  BarChart3, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  FileCheck2, 
  Clock, 
  Building2, 
  Users,
  Shield,
  Activity
} from "lucide-react";

export default function AdminOperationsPage() {
  // Incoming customer requests waiting for dispatch
  const [requests, setRequests] = useState<any[]>([
    {
      id: "req-2026-009",
      facility_name: "Unit 3 - Dairy Processing Facility (Mysuru)",
      org_name: "Kavery Pure Milks Coop",
      category: "Milk Processing",
      requested_date: "2026-11-02",
      notes: "Annual scheduled second-party cold chain audit.",
      assigned_auditor: "Unassigned"
    },
    {
      id: "req-2026-010",
      facility_name: "FreshBakery Commercial Oven Unit (Whitefield)",
      org_name: "Golden Breads Pvt Ltd",
      category: "General Manufacturing",
      requested_date: "2026-11-08",
      notes: "Hygiene and allergen cross-contact review.",
      assigned_auditor: "Unassigned"
    }
  ]);

  // Audits ready for final release
  const [approvedAudits, setApprovedAudits] = useState<any[]>([
    {
      id: "audit-demo-102",
      facility_name: "Unit 2 - Cold Storage & Warehouse (Hosur)",
      org_name: "Apex Logistics & Supply Chain",
      category: "Storage & Warehouse",
      lead_auditor: "Dr. Rajesh Iyer",
      score: 68,
      total_max: 74,
      percentage: 91.89,
      grade: "A+",
      status: "APPROVED"
    }
  ]);

  const [auditorList] = useState([
    { id: "aud-01", name: "Dr. Rajesh Iyer", sector: "Catering, Milk, Storage", active_audits: 2 },
    { id: "aud-02", name: "Ananya Deshmukh", sector: "General Manufacturing, Meat", active_audits: 1 },
    { id: "aud-03", name: "Vikramaditya Sen", sector: "Retail, Slaughterhouse, Transport", active_audits: 0 },
  ]);

  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const handleAssignAuditor = (reqId: string, auditorName: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
    setDispatchStatus(`Audit request ${reqId} successfully assigned to ${auditorName}. Auditor notified.`);
  };

  const handleReleaseReport = (auditId: string) => {
    setApprovedAudits((prev) => prev.filter((a) => a.id !== auditId));
    setDispatchStatus(`Audit ${auditId} marked RELEASED. Official certified dossier is now accessible to the customer organisation.`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Administrative Operations & Quality Monitoring
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Auditor dispatch management, engine performance analytics, reviewer disagreement metrics, and final report release authorization.
        </p>
      </div>

      {dispatchStatus && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle size={16} /> {dispatchStatus}
          </div>
          <button onClick={() => setDispatchStatus(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Operational KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Engine Accuracy (OKF)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">98.3%</div>
          <span className="text-[11px] text-slate-400">Zero-hallucination benchmark</span>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Engine Latency</span>
          <div className="text-2xl font-black text-blue-600 mt-1">438 ms</div>
          <span className="text-[11px] text-slate-400">100% offline edge execution</span>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reviewer Override Rate</span>
          <div className="text-2xl font-black text-purple-600 mt-1">2.4%</div>
          <span className="text-[11px] text-slate-400">High auditor consensus</span>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Dispatch Queue</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{requests.length} Requests</div>
          <span className="text-[11px] text-slate-400">Pending auditor assignment</span>
        </div>
      </div>

      {/* SECTION 1: INCOMING AUDIT DISPATCH */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck size={18} className="text-blue-600" /> Incoming Customer Audit Dispatch
            </h3>
            <p className="text-xs text-slate-500">Assign certified lead auditors based on sector competency and current workload</p>
          </div>
          <span className="text-xs font-bold text-blue-600">{requests.length} Pending</span>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">All customer audit requests have been assigned.</div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{r.facility_name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {r.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>Org: <strong>{r.org_name}</strong></span>
                    <span>Date: {r.requested_date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Assign Auditor:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleAssignAuditor(r.id, e.target.value);
                    }}
                    defaultValue=""
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="" disabled>Select Certified Auditor...</option>
                    {auditorList.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name} ({a.sector} — {a.active_audits} active)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: RELEASE AUTHORIZATION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 size={18} className="text-emerald-600" /> Report Release & Publication Authorization
            </h3>
            <p className="text-xs text-slate-500">Audits approved by expert reviewers ready for publication to customer organisation portal</p>
          </div>
          <span className="text-xs font-bold text-emerald-600">{approvedAudits.length} Ready</span>
        </div>

        {approvedAudits.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No audits pending release authorization.</div>
        ) : (
          <div className="space-y-3">
            {approvedAudits.map((a) => (
              <div key={a.id} className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{a.facility_name}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                      Approved Grade {a.grade} ({a.percentage}%)
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Org: <strong>{a.org_name}</strong> | Lead Auditor: {a.lead_auditor}
                  </div>
                </div>

                <button
                  onClick={() => handleReleaseReport(a.id)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-colors self-end md:self-center"
                >
                  <Send size={14} /> Authorize & Release to Customer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: 4-ENGINE BENCHMARK & SYSTEM HEALTH */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Activity size={18} className="text-indigo-600" /> Multi-Engine Verification Telemetry
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">1. Classical NLP</span>
            <div className="text-[11px] text-slate-500">Latency: ~9.5 ms</div>
            <div className="text-[11px] text-amber-600 font-semibold">Binary C/NC Only</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">2. Deep Learning NLI</span>
            <div className="text-[11px] text-slate-500">Latency: ~12.7 ms</div>
            <div className="text-[11px] text-emerald-600 font-semibold">4-Class Entailment</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">3. Extractive RAG</span>
            <div className="text-[11px] text-slate-500">Latency: ~3,550 ms</div>
            <div className="text-[11px] text-blue-600 font-semibold">Interactive Auditor Bot</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-900 space-y-1">
            <span className="font-bold text-blue-900 dark:text-blue-200">4. OKF Traversal (Winner)</span>
            <div className="text-[11px] text-blue-700 dark:text-blue-300">Latency: ~438 ms</div>
            <div className="text-[11px] text-emerald-600 font-bold">98.3% Accuracy (Provenance)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
