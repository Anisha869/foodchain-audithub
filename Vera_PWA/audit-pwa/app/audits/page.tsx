"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { AuditStatusBadge } from "@/components/StatusBadge";
import { 
  FileCheck, 
  Building2, 
  Calendar, 
  ArrowRight, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Search,
  Filter
} from "lucide-react";

export default function AuditorWorkspacePage() {
  const [audits, setAudits] = useState<any[]>([
    {
      id: "audit-demo-101",
      facility_name: "Unit 1 - Central Kitchen (Bengaluru)",
      org_name: "FreshFoods Processing Ltd.",
      category: "Catering",
      status: "RELEASED",
      assigned_date: "2026-10-14",
      last_updated: "2026-10-18",
      lead_auditor: "Dr. Rajesh Iyer",
      score: 104,
      total_max: 114,
      percentage: 91.23,
      grade: "A+",
      stage: "Released & Certified"
    },
    {
      id: "audit-demo-102",
      facility_name: "Unit 2 - Cold Storage & Warehouse (Hosur)",
      org_name: "Apex Logistics & Supply Chain",
      category: "Storage & Warehouse",
      status: "EXPERT_REVIEW",
      assigned_date: "2026-10-18",
      last_updated: "2026-10-19",
      lead_auditor: "Dr. Rajesh Iyer",
      score: 68,
      total_max: 74,
      percentage: 91.89,
      grade: "A+",
      stage: "Under Expert Review"
    },
    {
      id: "audit-demo-103",
      facility_name: "Unit 3 - Dairy Processing Facility (Mysuru)",
      org_name: "Kavery Pure Milks Coop",
      category: "Milk Processing",
      status: "DOCUMENT_UPLOADED",
      assigned_date: "2026-10-20",
      last_updated: "2026-10-20",
      lead_auditor: "Dr. Rajesh Iyer",
      score: null,
      total_max: 106,
      percentage: null,
      grade: null,
      stage: "Ready for AI Verification Run"
    },
    {
      id: "audit-demo-104",
      facility_name: "Apex Poultry & Meat Processing (Kolar)",
      org_name: "Prime Meats Exporters",
      category: "Meat Processing",
      status: "RETURNED_TO_AUDITOR",
      assigned_date: "2026-10-16",
      last_updated: "2026-10-19",
      lead_auditor: "Dr. Rajesh Iyer",
      score: 82,
      total_max: 102,
      percentage: 80.39,
      grade: "A",
      stage: "Requires Correction on Clause MP_18"
    }
  ]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const filtered = audits.filter((a) => {
    const matchSearch = 
      a.facility_name.toLowerCase().includes(search.toLowerCase()) ||
      a.org_name.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" ? true : a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
            <Cpu size={12} /> Lead Auditor Active Portfolio
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Auditor Execution Workspace</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Upload inspection reports, run VERA’s 4 AI verification engines, correct clause verdicts with mandatory justification logs, and submit for expert oversight.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Assigned Audits</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{audits.length}</div>
          <span className="text-[10px] text-slate-400">Total in auditor queue</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Needs Action</span>
          <div className="text-2xl font-black text-amber-500 mt-1">2</div>
          <span className="text-[10px] text-slate-400">Pending upload or correction</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">In Expert Review</span>
          <div className="text-2xl font-black text-purple-500 mt-1">1</div>
          <span className="text-[10px] text-slate-400">Supervisor queue</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Released & Certified</span>
          <div className="text-2xl font-black text-emerald-500 mt-1">1</div>
          <span className="text-[10px] text-slate-400">Customer visible</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facility, organisation, or sector..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["ALL", "DOCUMENT_UPLOADED", "EXPERT_REVIEW", "RETURNED_TO_AUDITOR", "RELEASED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === st
                  ? "bg-slate-900 text-white dark:bg-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              {st === "ALL" ? "All Audits" : st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Audits Card List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{item.facility_name}</span>
                <AuditStatusBadge status={item.status} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  {item.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Building2 size={12} /> {item.org_name}
              </p>
              <div className="text-[11px] text-slate-400 flex items-center gap-3">
                <span>Assigned: {item.assigned_date}</span>
                <span>Stage: <strong className="text-slate-700 dark:text-slate-300">{item.stage}</strong></span>
              </div>
            </div>

            {/* Score / Action */}
            <div className="flex items-center gap-4 self-end md:self-center">
              {item.percentage !== null && (
                <div className="text-right">
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {item.percentage}%
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Grade {item.grade}
                  </span>
                </div>
              )}

              <Link
                href={`/audits/${item.id}`}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
              >
                Open Audit Workspace <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
