import React from "react";

export function ComplianceBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  if (s === "C") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
        C — Compliance
      </span>
    );
  }
  if (s === "PC") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        PC — Partial Compliance
      </span>
    );
  }
  if (s === "NC") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
        NC — Non Compliance
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
      NA — Not Applicable
    </span>
  );
}

export function AuditStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300" },
    REQUEST_SUBMITTED: { label: "Request Submitted", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300" },
    ASSIGNED: { label: "Assigned to Auditor", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300" },
    DOCUMENT_UPLOADED: { label: "Report Uploaded", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300" },
    AI_VERIFIED: { label: "AI Verified", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300" },
    AUDITOR_SUBMITTED: { label: "Auditor Submitted", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300" },
    EXPERT_REVIEW: { label: "In Expert Review", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300" },
    RETURNED_TO_AUDITOR: { label: "Returned for Correction", color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300" },
    APPROVED: { label: "Approved (Ready for Release)", color: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300" },
    RELEASED: { label: "Released & Certified", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-400" },
  };

  const current = map[status] || { label: status, color: "bg-slate-100 text-slate-700 border-slate-300" };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.color}`}>
      {current.label}
    </span>
  );
}
