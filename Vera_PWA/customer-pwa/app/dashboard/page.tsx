"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { AuditStatusBadge } from "@/components/StatusBadge";
import { 
  Building2, 
  Send, 
  FileCheck2, 
  Clock, 
  ArrowRight, 
  PlusCircle, 
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  ExternalLink
} from "lucide-react";

export default function CustomerDashboard() {
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>({
    name: "FreshFoods Processing Ltd.",
    license_no: "FSSAI-LIC-10020033000412",
    category: "General Manufacturing & Catering",
    facilities_count: 3
  });

  const [audits, setAudits] = useState<any[]>([
    {
      id: "audit-demo-101",
      facility_name: "Unit 1 - Central Kitchen (Bengaluru)",
      category: "Catering",
      status: "RELEASED",
      requested_date: "2026-10-14",
      score: 104,
      total_max: 114,
      percentage: 91.23,
      grade: "A+",
      released_at: "2026-10-18",
    },
    {
      id: "audit-demo-102",
      facility_name: "Unit 2 - Cold Storage & Warehouse (Hosur)",
      category: "Storage & Warehouse",
      status: "EXPERT_REVIEW",
      requested_date: "2026-10-18",
      score: null,
      total_max: 74,
      percentage: null,
      grade: null,
      released_at: null,
    },
    {
      id: "audit-demo-103",
      facility_name: "Unit 3 - Dairy Processing Facility (Mysuru)",
      category: "Milk Processing",
      status: "DOCUMENT_UPLOADED",
      requested_date: "2026-10-20",
      score: null,
      total_max: 106,
      percentage: null,
      grade: null,
      released_at: null,
    }
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: dbAudits } = await supabase
          .from("audits")
          .select("*, facilities(name), checklists(title, category)")
          .order("created_at", { ascending: false });

        if (dbAudits && dbAudits.length > 0) {
          setAudits(dbAudits.map((a: any) => ({
            id: a.id,
            facility_name: a.facilities?.name || "Facility",
            category: a.checklists?.category || "General Manufacturing",
            status: a.status,
            requested_date: a.created_at?.split("T")[0] || "2026-10-20",
            score: a.total_score,
            total_max: a.total_max,
            percentage: a.percentage,
            grade: a.grade,
            released_at: a.updated_at?.split("T")[0],
          })));
        }
      } catch (err) {
        // Fallback to demo data
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const releasedCount = audits.filter(a => a.status === "RELEASED").length;
  const activeCount = audits.filter(a => a.status !== "RELEASED").length;

  return (
    <div className="space-y-8">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300">
              <Building2 size={14} /> {org.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Customer Organisation Dashboard</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              License: <span className="font-mono text-emerald-400 font-bold">{org.license_no}</span> | Monitoring {org.facilities_count} registered production & storage facilities.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/request-audit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/30 transition-all flex items-center gap-2"
            >
              <PlusCircle size={16} /> Request Audit
            </Link>
            <Link
              href="/checklists"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-sm transition-all"
            >
              Checklists
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Audits</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{activeCount}</div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <Clock size={12} /> Under verification / review
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Released Reports</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{releasedCount}</div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <CheckCircle size={12} /> Certified & downloadable
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">FSSAI Categories</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">8</div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <FileSpreadsheet size={12} /> Annex 5 Standard
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registered Facilities</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{org.facilities_count}</div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <Building2 size={12} /> Authorized scopes
          </span>
        </div>
      </div>

      {/* Audits Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Facility Audit Tracking</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time lifecycle tracking of all second-party inspections</p>
          </div>
          <Link
            href="/request-audit"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            New Request <ArrowRight size={14} />
          </Link>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {audits.map((item) => (
            <div key={item.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{item.facility_name}</span>
                  <AuditStatusBadge status={item.status} />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Category: <strong className="text-slate-700 dark:text-slate-200">{item.category}</strong></span>
                  <span>Requested: {item.requested_date}</span>
                  {item.released_at && <span>Released: <strong className="text-emerald-600 dark:text-emerald-400">{item.released_at}</strong></span>}
                </div>
              </div>

              {/* Score / Action */}
              <div className="flex items-center gap-4 self-end md:self-center">
                {item.status === "RELEASED" ? (
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-lg font-black text-slate-900 dark:text-white">{item.percentage}%</span>
                      <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Grade {item.grade}
                      </span>
                    </div>
                    <Link
                      href={`/reports/${item.id}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Report Dossier <ExternalLink size={12} />
                    </Link>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">In Progress</div>
                    <span className="text-[11px] text-slate-500">Auditor / Expert Review</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
