"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Layers, 
  CheckCircle2, 
  RotateCcw, 
  Edit3, 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Send,
  UserCheck
} from "lucide-react";
import { ComplianceBadge, AuditStatusBadge } from "@/components/StatusBadge";

export default function ExpertReviewQueuePage() {
  const [queue, setQueue] = useState<any[]>([
    {
      id: "audit-demo-102",
      facility_name: "Unit 2 - Cold Storage & Warehouse (Hosur)",
      org_name: "Apex Logistics & Supply Chain",
      category: "Storage & Warehouse",
      auditor_name: "Dr. Rajesh Iyer",
      submitted_date: "2026-10-19",
      status: "EXPERT_REVIEW",
      score: 68,
      total_max: 74,
      percentage: 91.89,
      grade: "A+",
      pending_review_count: 2,
      critical_items: [
        {
          item_id: "SW_04",
          question: "Refrigerated and frozen storage areas are fitted with continuous calibrated temperature recorders with remote alarm systems.",
          weight: 4,
          auditor_status: "C",
          evidence: "Walk-in deep freeze unit logged steady -18.2C with GSM alarm notification module functional."
        },
        {
          item_id: "SW_11",
          question: "Effective rodent, insect, and bird proofing maintained across all loading docks and air curtain thresholds.",
          weight: 2,
          auditor_status: "PC",
          evidence: "Secondary PVC strip curtain at dock #3 had minor tear; pest log shows zero rodent activity inside warehouse envelope."
        }
      ]
    }
  ]);

  const [selectedAudit, setSelectedAudit] = useState<any | null>(queue[0] || null);
  const [actionModal, setActionModal] = useState<"ACCEPT" | "OVERRIDE" | "RETURN" | null>(null);
  const [modalItem, setModalItem] = useState<any | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [newVerdict, setNewVerdict] = useState("C");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleExecuteAction = () => {
    if (!decisionReason.trim()) {
      alert("Mandatory explanation/justification is required for expert review decisions.");
      return;
    }

    if (actionModal === "RETURN") {
      setActionSuccess(`Audit ${selectedAudit.id} returned to auditor ${selectedAudit.auditor_name} with correction notes.`);
      setQueue((prev) => prev.filter((q) => q.id !== selectedAudit.id));
      setSelectedAudit(null);
    } else if (actionModal === "ACCEPT") {
      setActionSuccess(`Audit ${selectedAudit.id} approved and moved to Release Authorization.`);
      setQueue((prev) => prev.filter((q) => q.id !== selectedAudit.id));
      setSelectedAudit(null);
    } else if (actionModal === "OVERRIDE") {
      setActionSuccess(`Finding ${modalItem.item_id} overridden to ${newVerdict}. Reason logged.`);
    }

    setActionModal(null);
    setDecisionReason("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Expert Review & Quality Assurance Queue
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Peer review for second-party food audits. Accept preliminary findings, override with mandatory regulatory rationale, or return to auditor for correction.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} /> {actionSuccess}
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold">✕</button>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Review Backlog Clear</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All submitted preliminary audits have been reviewed and approved or returned to auditors.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audits list sidebar */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pending Expert Review ({queue.length})
            </h3>
            {queue.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedAudit(item)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedAudit?.id === item.id
                    ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{item.facility_name}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      Grade {item.grade}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{item.org_name}</p>
                  <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                    <span>Auditor: {item.auditor_name}</span>
                    <span>{item.submitted_date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Inspection & Decision Workspace */}
          {selectedAudit && (
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedAudit.facility_name}</h2>
                    <p className="text-xs text-slate-500">
                      Lead Auditor: <strong>{selectedAudit.auditor_name}</strong> | Category: <strong>{selectedAudit.category}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      {selectedAudit.percentage}%
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Score: {selectedAudit.score} / {selectedAudit.total_max}
                    </span>
                  </div>
                </div>

                {/* Critical Clauses for Review */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Clauses Flagged for Expert Scrutiny
                  </h3>

                  <div className="space-y-3">
                    {selectedAudit.critical_items.map((it: any) => (
                      <div key={it.item_id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-purple-600">{it.item_id}</span>
                          <div className="flex items-center gap-2">
                            <ComplianceBadge status={it.auditor_status} />
                            <button
                              onClick={() => {
                                setModalItem(it);
                                setNewVerdict(it.auditor_status);
                                setActionModal("OVERRIDE");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                            >
                              Expert Override
                            </button>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{it.question}</p>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                          <strong>Auditor Note / Evidence: </strong>{it.evidence}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Three Core Expert Actions */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setActionModal("RETURN")}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-900 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Return to Auditor for Correction
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActionModal("ACCEPT")}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 size={14} /> Approve & Sign Off Dossier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Decision Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              {actionModal === "RETURN" && "Return Audit to Auditor with Mandatory Correction Notes"}
              {actionModal === "ACCEPT" && "Approve & Sign Off Audit for Administrative Release"}
              {actionModal === "OVERRIDE" && `Expert Finding Override for Clause ${modalItem?.item_id}`}
            </h3>

            {actionModal === "OVERRIDE" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Expert Verdict
                </label>
                <select
                  value={newVerdict}
                  onChange={(e) => setNewVerdict(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="C">C — Compliance</option>
                  <option value="PC">PC — Partial Compliance</option>
                  <option value="NC">NC — Non Compliance</option>
                  <option value="NA">NA — Not Applicable</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mandatory Regulatory Reason / Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="State statutory reference, correction instructions, or technical rationale..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-500/20"
              >
                Confirm & Record Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
