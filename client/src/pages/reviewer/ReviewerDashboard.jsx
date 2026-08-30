import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../services/api.js";
import { 
  FileCheck2, 
  CheckCircle2, 
  RotateCcw, 
  FileX,
  AlertTriangle,
  Building,
  Calendar,
  Eye,
  MessageSquare,
  Award,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  ClipboardList,
  Save,
  CheckCircle,
  Check,
  X,
  XCircle,
  Clock,
  Filter
} from "lucide-react";

const ReviewerDashboard = () => {
  const { user } = useAuth();
  
  // Dashboard state
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Selected audit for active review panel
  const [activeReview, setActiveReview] = useState(null);
  const [reviewAnswers, setReviewAnswers] = useState([]);
  const [reviewerComments, setReviewerComments] = useState("");

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const { data } = await api.get("/audits");
      setReviews(data.audits || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load technical review queue from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Enter active review mode
  const startReviewMode = (audit) => {
    setActiveReview(audit);
    setReviewAnswers(audit.answers || []);
    setReviewerComments(audit.reviewerComments || "");
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Close active review mode
  const exitReviewMode = () => {
    setActiveReview(null);
    setReviewAnswers([]);
    setReviewerComments("");
    setErrorMsg("");
    setSuccessMsg("");
    fetchReviews();
  };

  // Handle score override by reviewer
  const handleScoreOverride = (itemIdx, newScore) => {
    const nextAnswers = [...reviewAnswers];
    const item = nextAnswers[itemIdx];
    const scoreNum = Number(newScore);
    const maxScore = Number(item.maxScore) || 10;

    let severity = item.severity;
    if (scoreNum === maxScore) {
      severity = "None";
    } else if (scoreNum === 0) {
      severity = "Critical";
    } else if (scoreNum <= maxScore / 2) {
      severity = "Major";
    } else {
      severity = "Minor";
    }

    nextAnswers[itemIdx] = {
      ...item,
      score: scoreNum,
      severity
    };
    setReviewAnswers(nextAnswers);
  };

  // Handle reviewer overrides
  const handleOverrideField = (itemIdx, field, value) => {
    const nextAnswers = [...reviewAnswers];
    nextAnswers[itemIdx] = {
      ...nextAnswers[itemIdx],
      [field]: value
    };
    setReviewAnswers(nextAnswers);
  };

  // Submit action: APPROVE, SEND_BACK, REJECT
  const submitReviewAction = async (actionType) => {
    try {
      setActionLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const { data } = await api.post(`/audits/${activeReview._id}/review`, {
        action: actionType,
        reviewerComments,
        answers: reviewAnswers
      });

      setSuccessMsg(data.message || `Audit status updated successfully key: ${actionType}`);
      setTimeout(() => {
        exitReviewMode();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to upload technical reviewer decision.");
      setActionLoading(false);
    }
  };

  // Calculate live score percent during overrides
  const getLiveScore = () => {
    let total = 0;
    let max = 0;
    let passCount = 0;
    let failCount = 0;

    for (const ans of reviewAnswers) {
      const s = Number(ans.score) || 0;
      const m = Number(ans.maxScore) || 10;
      total += s;
      max += m;
      if (s === m) passCount++;
      else if (s === 0) failCount++;
    }
    const percent = max > 0 ? Math.round((total / max) * 100) : 100;
    return { total, max, passCount, failCount, percent };
  };

  const liveStats = getLiveScore();

  // Filtered reviews list based on selected status tab
  const filteredReviews = reviews.filter(rev => {
    if (statusFilter === "ALL") return true;
    return rev.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-100 border-emerald-300 text-emerald-800 font-extrabold";
      case "UNDER_REVIEW":
        return "bg-purple-100 border-purple-300 text-purple-800 font-extrabold animate-pulse";
      case "IN_PROGRESS":
        return "bg-amber-100 border-amber-300 text-amber-800 font-extrabold";
      case "SCHEDULED":
        return "bg-blue-100 border-blue-300 text-blue-800 font-bold";
      case "REJECTED":
        return "bg-rose-100 border-rose-300 text-rose-800 font-extrabold";
      default:
        return "bg-slate-100 border-slate-300 text-slate-700 font-bold";
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* Active Technical Review Workspace */}
      {activeReview ? (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-6 animate-fadeIn">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-2">
              <button 
                onClick={exitReviewMode}
                className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                ← Back to All Audit Checklists
              </button>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2">
                <FileCheck2 className="text-purple-600" size={24} />
                Technical QA Quality Evaluation
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Audited Client: <span className="font-bold text-slate-900">{activeReview.customerId?.companyName || "Standard Client"}</span> ({activeReview.customerId?.code || "FCSC"})
              </p>
              <p className="text-xs text-slate-500 font-light">
                Facility checked: {activeReview.siteId?.siteName || "Central Facility"} — {activeReview.siteId?.address}, {activeReview.siteId?.city}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 border border-purple-200 px-5 py-2.5 rounded-2xl text-center shadow-sm">
                <span className="text-[10px] text-purple-600 font-bold block uppercase tracking-wider">Verified Score</span>
                <span className="text-2xl font-black text-purple-700">{liveStats.percent}%</span>
              </div>
            </div>
          </div>

          {/* Live Review Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-900 text-white shadow-md">
            <div className="space-y-1 text-center sm:text-left border-r border-slate-800 pr-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Points</span>
              <p className="text-xl font-black text-white">{reviewAnswers.length} Items</p>
            </div>
            <div className="space-y-1 text-center sm:text-left border-r border-slate-800 pr-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">Compliant (YES ✔️)</span>
              <p className="text-xl font-black text-emerald-400">{liveStats.passCount} Passed</p>
            </div>
            <div className="space-y-1 text-center sm:text-left border-r border-slate-800 pr-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-400">Defects (NO ❌)</span>
              <p className="text-xl font-black text-rose-400">{liveStats.failCount} Failed</p>
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-300">Audit Status</span>
              <p className="text-sm font-black uppercase text-purple-300">{activeReview.status.replace("_", " ")}</p>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="flex bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm gap-2">
              <AlertTriangle size={18} className="shrink-0 text-rose-600" />
              <div>{errorMsg}</div>
            </div>
          )}
          {successMsg && (
            <div className="flex bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Review Sheet Form */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Checklist Compliance Evaluation Grid</h3>
              <p className="text-xs text-slate-500">Review auditor field answers, verify non-conformities, or adjust scores and remarks prior to final signoff.</p>
            </div>

            {/* Editable compliance table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs table-fixed">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4 w-[160px]">Category</th>
                      <th className="py-3.5 px-4 w-[280px]">Checklist Question</th>
                      <th className="py-3.5 px-4 w-[150px] text-center">Auditor Field Result</th>
                      <th className="py-3.5 px-4 w-[130px] text-center">QA Override Score</th>
                      <th className="py-3.5 px-4 w-[120px] text-center">Severity</th>
                      <th className="py-3.5 px-4 w-[220px]">Auditor Observation Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reviewAnswers.map((item, idx) => {
                      const isPass = Number(item.score) === Number(item.maxScore);
                      const isFail = Number(item.score) === 0;

                      return (
                        <tr key={item.itemId || idx} className={`align-top ${isFail ? 'bg-rose-50/40' : isPass ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50'}`}>
                          <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold pt-4">{idx + 1}</td>
                          <td className="py-3 px-4 pt-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] break-keep truncate block text-center border border-slate-200">
                              {item.category || "General"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 pt-4 leading-relaxed whitespace-normal break-words">
                            {item.question}
                          </td>
                          
                          {/* Auditor Field Result Badge */}
                          <td className="py-3 px-4 text-center pt-3.5">
                            {isPass && (
                              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] inline-flex items-center gap-1 border border-emerald-300">
                                <Check size={13} className="stroke-[3]" /> YES (Pass)
                              </span>
                            )}
                            {isFail && (
                              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[11px] inline-flex items-center gap-1 border border-rose-300">
                                <X size={13} className="stroke-[3]" /> NO (Defect ❌)
                              </span>
                            )}
                            {!isPass && !isFail && (
                              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] inline-flex items-center gap-1 border border-amber-300">
                                Partial ({item.score} pts)
                              </span>
                            )}
                          </td>

                          {/* QA Override Score Dropdown */}
                          <td className="py-3 px-4 text-center pt-3.5">
                            <div className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-xl px-2 py-1 justify-center w-full">
                              <select
                                value={item.score}
                                onChange={(e) => handleScoreOverride(idx, e.target.value)}
                                className="bg-white border border-purple-300 rounded p-1 text-[11px] font-bold text-purple-900 w-[50px] text-center focus:outline-none"
                              >
                                {Array.from({ length: (item.maxScore || 10) + 1 }).map((_, i) => (
                                  <option key={i} value={i}>{i}</option>
                                ))}
                              </select>
                              <span className="text-purple-700 font-light text-[10px]">/ {item.maxScore || 10}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center pt-3.5">
                            <select
                              value={item.severity}
                              onChange={(e) => handleOverrideField(idx, "severity", e.target.value)}
                              className={`w-full p-2 border rounded-xl text-[10px] font-bold text-center appearance-none cursor-pointer focus:outline-none ${
                                item.severity === 'Critical' ? 'bg-rose-100 border-rose-300 text-rose-800' :
                                item.severity === 'Major' ? 'bg-amber-100 border-amber-300 text-amber-800' :
                                item.severity === 'Minor' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                                'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <option value="None">None</option>
                              <option value="Minor">Minor</option>
                              <option value="Major">Major</option>
                              <option value="Critical">Critical</option>
                            </select>
                          </td>

                          <td className="py-3 px-4 pt-3.5">
                            <input
                              type="text"
                              value={item.comment || ""}
                              placeholder="Auditor observation / QA remarks..."
                              onChange={(e) => handleOverrideField(idx, "comment", e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-xl text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-slate-50"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QA Feedback text input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">
                Technical Review Feedback &amp; Verification Signoff Comments
              </label>
              <textarea
                rows={2}
                value={reviewerComments}
                onChange={(e) => setReviewerComments(e.target.value)}
                placeholder="Enter regulatory feedback note, verification comments, or reason for return..."
                className="w-full p-4 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Decision panel actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <button
                onClick={exitReviewMode}
                className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer text-left sm:text-center shadow-sm"
              >
                Exit Review Workspace
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => submitReviewAction("SEND_BACK")}
                  disabled={actionLoading}
                  className="py-2.5 px-5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RotateCcw size={14} /> Send Back to Auditor
                </button>
                <button
                  onClick={() => submitReviewAction("APPROVE")}
                  disabled={actionLoading}
                  className="py-2.5 px-6 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-700 flex items-center gap-2 cursor-pointer shadow-md transition-colors"
                >
                  <CheckCircle size={16} /> Approve &amp; Release Report
                </button>
              </div>
            </div>

          </div>

        </div>
      ) : (
        // Technical Review Queue Index page
        <div className="space-y-8">
          
          {/* Welcome Banner */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl bg-white border border-slate-200">
            <div className="space-y-2 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                <FileCheck2 size={14} className="text-purple-700" />
                Technical QA Signoff
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Reviewer Workspace: {user?.name}</h1>
              <p className="text-sm font-light text-slate-600 max-w-2xl">
                Real-time technical view of all customer audit checklists across all execution statuses. Review answers, verify non-conformities, and release official compliance reports.
              </p>
            </div>
            <div className="flex bg-purple-50/50 p-4 rounded-xl border border-purple-100 items-center gap-3">
              <ShieldCheck className="text-purple-700" size={24} />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Quality QA Desk</h4>
                <p className="text-[10px] text-slate-500">All audit statuses active &amp; visible.</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="flex bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm gap-2">
              <AlertTriangle size={18} className="shrink-0 text-rose-600" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Active Review Queue Section */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            
            {/* Header & Status Filter Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-md font-bold text-slate-900 tracking-tight">Checklist Audits Overview Queue ({filteredReviews.length})</h2>
                <p className="text-xs text-slate-500">Filter audits by status or click to open the quality evaluation workspace</p>
              </div>

              {/* Status Filter Tab Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {[
                  { id: "ALL", label: "All Audits" },
                  { id: "IN_PROGRESS", label: "In Field Execution" },
                  { id: "UNDER_REVIEW", label: "Pending QA Review" },
                  { id: "APPROVED", label: "Approved & Released" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Accessing queue registers...</div>
            ) : filteredReviews.length === 0 ? (
              <div className="py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                No audits found for status filter "{statusFilter}".
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((rev) => (
                  <div key={rev._id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-100/60 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-purple-700">{rev.auditRef}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase border ${getStatusBadge(rev.status)}`}>
                          {rev.status.replace("_", " ")}
                        </span>
                        {rev.standard && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-slate-200 text-slate-700 uppercase">
                            {rev.standard}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs">
                        <h3 className="font-black text-slate-900 text-sm">{rev.customerId?.companyName || "Standard Client"}</h3>
                        <p className="text-slate-500 font-light mt-0.5">{rev.siteId?.siteName || "Central Facility"} — {rev.siteId?.city}, {rev.siteId?.state}</p>
                      </div>

                      {rev.checklistId && (
                        <p className="text-[11px] text-slate-600 font-semibold flex items-center gap-1.5">
                          <ClipboardList size={13} className="text-purple-600" />
                          Linked Checklist: <span className="font-bold text-slate-900">{rev.checklistId.name}</span> ({rev.answers?.length || 0} questions evaluated)
                        </p>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 p-3 pt-3 md:p-0 border-slate-200 gap-2">
                      <div className="text-right text-xs">
                        <span className="text-[10px] text-slate-400 block font-semibold">Current Score</span>
                        <span className="font-black text-slate-900 text-base">{rev.score !== null ? `${rev.score}%` : "—"}</span>
                      </div>

                      <button
                        onClick={() => startReviewMode(rev)}
                        className={`py-2 px-4 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm ${
                          rev.status === 'APPROVED' 
                            ? 'bg-slate-700 hover:bg-slate-600' 
                            : rev.status === 'UNDER_REVIEW'
                            ? 'bg-purple-600 hover:bg-purple-700 ring-2 ring-purple-300'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <Eye size={13} />
                        <span>{rev.status === 'APPROVED' ? "View Released Report" : rev.status === 'UNDER_REVIEW' ? "Perform QA Signoff" : "Inspect Checklist Status"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default ReviewerDashboard;
