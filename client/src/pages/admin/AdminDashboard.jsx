import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../services/api.js";
import { 
  ShieldCheck, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Building2, 
  FileText,
  Search,
  Filter,
  FileSpreadsheet,
  Eye,
  Check,
  X
} from "lucide-react";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [audits, setAudits] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const auditsRes = await api.get("/audits");
      setAudits(auditsRes.data.audits || []);

      const checklistsRes = await api.get("/checklists");
      setChecklists(checklistsRes.data.checklists || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
      setErrorMsg("Failed to load audit records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAudits = audits.filter(audit => {
    const custName = audit.customerId?.companyName || "";
    const ref = audit.auditRef || "";
    const matchesSearch = custName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ref.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || audit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 border-blue-300 font-bold";
      case "IN_PROGRESS":
        return "bg-amber-100 text-amber-800 border-amber-300 font-extrabold animate-pulse";
      case "UNDER_REVIEW":
        return "bg-purple-100 text-purple-800 border-purple-300 font-extrabold";
      case "APPROVED":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-black";
      case "REJECTED":
        return "bg-rose-100 text-rose-800 border-rose-300 font-black";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300 font-bold";
    }
  };

  // KPI metrics calculations
  const totalAudits = audits.length;
  const scheduledCount = audits.filter(a => a.status === "SCHEDULED").length;
  const inExecutionCount = audits.filter(a => a.status === "IN_PROGRESS" || a.status === "UNDER_REVIEW").length;
  const approvedCount = audits.filter(a => a.status === "APPROVED").length;
  const approvalRate = totalAudits > 0 ? Math.round((approvedCount / totalAudits) * 100) : 100;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl bg-white border border-slate-200">
        <div className="space-y-2 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <ShieldCheck size={14} className="text-emerald-700" />
            Audit System Control Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Administrator: {user?.name}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Live overview of all customer compliance checklists, auditor field execution progress, and technical signoffs across the enterprise.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-sm">
            {checklists.length} Master Checklists Active
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: "Total Audits", value: totalAudits, change: `${checklists.length} formats`, icon: FileText, color: "text-teal-600", bg: "bg-teal-50 border-teal-200" },
          { title: "Scheduled", value: scheduledCount, change: "Pending start", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { title: "In Execution / Review", value: inExecutionCount, change: "Active in field", icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          { title: "Approval Signoff Rate", value: `${approvalRate}%`, change: `${approvedCount} approved`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
        ].map((kpi) => (
          <div key={kpi.title} className="p-5 sm:p-6 rounded-3xl space-y-3 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.title}</span>
              <div className={`p-2.5 rounded-2xl border ${kpi.bg} ${kpi.color}`}>
                <kpi.icon size={20} />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-teal-600 shrink-0" />
              {kpi.change}
            </p>
          </div>
        ))}
      </div>

      {/* Live Audit Registers Table */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Active Audit Registers ({filteredAudits.length})</h2>
            <p className="text-xs text-slate-500">Real-time status of all second-party audit checklists and field inspections</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer or ref..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Field Execution</option>
              <option value="UNDER_REVIEW">Under Technical Review</option>
              <option value="APPROVED">Approved &amp; Released</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Audit Ref</th>
                <th className="py-3.5 px-4">Customer &amp; Site</th>
                <th className="py-3.5 px-4">Linked Checklist Format</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Questions Checked</th>
                <th className="py-3.5 px-4 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading audit status registers...</td>
                </tr>
              ) : filteredAudits.length === 0 ? (
                <tr>
                  <td className="py-12 px-4 text-center text-slate-400" colSpan={6}>
                    No audit records found matching status filter "{statusFilter}".
                  </td>
                </tr>
              ) : (
                filteredAudits.map((audit) => (
                  <tr key={audit._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-mono text-xs text-emerald-700 font-bold">{audit.auditRef}</td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900 text-xs">{audit.customerId?.companyName || "Standard Client"}</p>
                      <p className="text-[11px] text-slate-500">{audit.siteId?.siteName} ({audit.siteId?.city || "Site"})</p>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-slate-800">
                      {audit.checklistId ? audit.checklistId.name : <span className="text-slate-400 italic">No checklist attached</span>}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] uppercase border ${getStatusBadge(audit.status)}`}>
                        {audit.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-slate-700">
                      {audit.answers?.length || 0} Points
                    </td>
                    <td className="py-4 px-4 text-right font-black text-slate-900 text-sm">
                      {audit.score !== null ? `${audit.score}%` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
