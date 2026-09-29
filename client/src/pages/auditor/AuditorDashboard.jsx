import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../services/api.js";
import { 
  ClipboardList, 
  Play, 
  CheckCircle2, 
  Save, 
  Send, 
  ArrowLeft,
  XCircle,
  Building,
  Calendar,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Sparkles,
  UserCheck,
  FileText,
  Eye,
  X,
  Check,
  AlertTriangle,
  MinusCircle,
  User,
  Edit,
  Award,
  Briefcase,
  Phone,
  MapPin
} from "lucide-react";

const AuditorDashboard = () => {
  const { user } = useAuth();
  
  // State lists
  const [audits, setAudits] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Schedule form states
  const [selectedCust, setSelectedCust] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [auditNotes, setAuditNotes] = useState("");
  const [formChecklistId, setFormChecklistId] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  
  // Execution states
  const [activeAudit, setActiveAudit] = useState(null);
  const [selectedChecklistId, setSelectedChecklistId] = useState("");
  const [checklistItems, setChecklistItems] = useState([]); // answers inside the audit
  const [notes, setNotes] = useState("");

  // Preview Checklist Modal state
  const [previewChecklist, setPreviewChecklist] = useState(null);

  // Auditor Profile Modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    specialization: "",
    certifications: "",
    experienceYears: 0,
    qualification: "",
    auditorIdCode: "",
    address: "",
    bio: ""
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const handleOpenProfile = () => {
    setProfileForm({
      name: user?.name || "",
      phone: user?.phone || "",
      specialization: user?.specialization || "",
      certifications: Array.isArray(user?.certifications) ? user.certifications.join(", ") : (user?.certifications || ""),
      experienceYears: user?.experienceYears || 0,
      qualification: user?.qualification || "",
      auditorIdCode: user?.auditorIdCode || "",
      address: user?.address || "",
      bio: user?.bio || ""
    });
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setErrorMsg("");
      const { data } = await api.put("/auth/profile", profileForm);
      localStorage.setItem("fah_user", JSON.stringify(data.user));
      setSuccessMsg("Auditor details updated & saved to MongoDB successfully!");
      setShowProfileModal(false);
      fetchData();
    } catch (err) {
      console.error("Profile update error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to save auditor details.");
    } finally {
      setSavingProfile(false);
    }
  };
  
  // UI messages
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const auditsRes = await api.get("/audits");
      setAudits(auditsRes.data.audits || []);
      
      const checklistsRes = await api.get("/checklists");
      setChecklists(checklistsRes.data.checklists || []);
      
      const customersRes = await api.get("/customers");
      setCustomers(customersRes.data.customers || []);
      
      setErrorMsg("");
    } catch (err) {
      console.error("Error loading auditor data:", err);
      setErrorMsg("Failed to load audit resources from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle customer choice to load sites
  useEffect(() => {
    if (!selectedCust) {
      setSites([]);
      return;
    }
    const loadSites = async () => {
      try {
        const { data } = await api.get(`/customers/${selectedCust}`);
        setSites(data.sites || []);
      } catch (err) {
        console.error("Error loading sites:", err);
      }
    };
    loadSites();
  }, [selectedCust]);

  // Schedule audit manually
  const handleScheduleAudit = async (e) => {
    e.preventDefault();
    try {
      setScheduleLoading(true);
      setErrorMsg("");
      
      const selectCustObj = customers.find(c => c._id === selectedCust);
      const standard = selectCustObj ? (selectCustObj.industryCategory?.includes("FSSAI") ? "FSSAI" : "ISO 22000") : "FSSAI";
      
      const { data } = await api.post("/audits", {
        customerId: selectedCust || null,
        siteId: selectedSite || null,
        standard,
        scheduledDate: scheduledDate || new Date(),
        notes: auditNotes,
        checklistId: formChecklistId || null
      });
      
      setSuccessMsg("Inspection schedule created successfully!");
      setSelectedCust("");
      setSelectedSite("");
      setScheduledDate("");
      setAuditNotes("");
      setFormChecklistId("");
      
      fetchData();
      
      // If a checklist was linked, launch execution directly
      if (formChecklistId && data.audit) {
        startAuditExecution(data.audit);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to create audit schedule.");
    } finally {
      setScheduleLoading(false);
    }
  };

  // 1-Click Launch Audit directly from an uploaded checklist card
  const handleLaunchAuditFromChecklist = async (chk) => {
    try {
      setLoading(true);
      setErrorMsg("");
      
      // Default to customerId on the checklist or first customer if available
      const custId = chk.customerId?._id || chk.customerId || (customers.length > 0 ? customers[0]._id : null);
      
      const { data } = await api.post("/audits", {
        customerId: custId,
        checklistId: chk._id,
        standard: chk.standard || "FSSAI",
        scheduledDate: new Date(),
        notes: `Direct audit session launched using: ${chk.name}`
      });
      
      setSuccessMsg(`Started audit with checklist: "${chk.name}"`);
      startAuditExecution(data.audit);
    } catch (err) {
      console.error("Launch audit error:", err);
      setErrorMsg("Could not launch audit execution session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Launch inspection view for an active audit
  const startAuditExecution = (audit) => {
    setActiveAudit(audit);
    setErrorMsg("");
    setSuccessMsg("");
    
    if (audit.checklistId) {
      setSelectedChecklistId(audit.checklistId._id || audit.checklistId);
      setChecklistItems(audit.answers || []);
      setNotes(audit.notes || "");
    } else {
      setSelectedChecklistId("");
      setChecklistItems([]);
      setNotes(audit.notes || "");
    }
  };

  // Select Checklist file -> calls API to copy items
  const handleLinkChecklist = async () => {
    if (!selectedChecklistId) {
      setErrorMsg("Please select a checklist to apply to this audit.");
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post(`/audits/${activeAudit._id}/start-checklist`, {
        checklistId: selectedChecklistId
      });
      
      setActiveAudit(data.audit);
      setChecklistItems(data.audit.answers || []);
      setSuccessMsg("Checklist items imported. Ready to perform inspection.");
      setErrorMsg("");
    } catch (err) {
      console.error("Link checklist error:", err);
      setErrorMsg("Could not apply selected checklist to audit record.");
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click YES / NO / NA Compliance status handler for each point
  const handleToggleCompliance = (itemIdx, status) => {
    const nextAnswers = [...checklistItems];
    const item = nextAnswers[itemIdx];
    const maxScore = Number(item.maxScore) || 10;

    if (status === "YES") {
      // Compliant -> Pass (Full Score, No Severity)
      nextAnswers[itemIdx] = {
        ...item,
        score: maxScore,
        severity: "None"
      };
    } else if (status === "NO") {
      // Non-Compliant -> Fail / Cross (0 Score, Major Severity)
      nextAnswers[itemIdx] = {
        ...item,
        score: 0,
        severity: item.severity === "None" ? "Major" : item.severity
      };
    } else if (status === "NA") {
      // Not Applicable -> Full Score, No Severity
      nextAnswers[itemIdx] = {
        ...item,
        score: maxScore,
        severity: "None"
      };
    }

    setChecklistItems(nextAnswers);
  };

  // Handle specific field updates (score dropdown, severity, comments)
  const handleAnswerChange = (itemIdx, field, value) => {
    const nextAnswers = [...checklistItems];
    nextAnswers[itemIdx] = {
      ...nextAnswers[itemIdx],
      [field]: value
    };
    
    // Auto-update severity if score changes manually
    if (field === "score") {
      const scoreNum = Number(value);
      const maxScore = Number(nextAnswers[itemIdx].maxScore);
      if (scoreNum === maxScore) {
        nextAnswers[itemIdx].severity = "None";
      } else if (scoreNum === 0) {
        nextAnswers[itemIdx].severity = "Critical";
      } else if (scoreNum <= maxScore / 2) {
        nextAnswers[itemIdx].severity = "Major";
      } else {
        nextAnswers[itemIdx].severity = "Minor";
      }
    }
    
    setChecklistItems(nextAnswers);
  };

  // Save draft or submit audit report
  const handleSaveAudit = async (isDraft) => {
    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      
      const { data } = await api.put(`/audits/${activeAudit._id}/submit-grades`, {
        answers: checklistItems,
        isDraft,
        notes
      });
      
      if (isDraft) {
        setSuccessMsg("Inspection draft saved successfully.");
        setActiveAudit(data.audit);
        setChecklistItems(data.audit.answers || []);
      } else {
        setSuccessMsg("Inspection questionnaire submitted for technical review sign-off.");
        setActiveAudit(null);
        setChecklistItems([]);
        setSelectedChecklistId("");
        
        fetchData();
      }
    } catch (err) {
      console.error("Save audit error:", err);
      setErrorMsg("Failed to upload compliance responses. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  // Back out of active panel
  const handleExitAuditMode = () => {
    setActiveAudit(null);
    setChecklistItems([]);
    setSelectedChecklistId("");
    setErrorMsg("");
    setSuccessMsg("");
    fetchData();
  };

  // Calculate live statistics for active checklist execution
  const getLiveScoreStats = () => {
    let totalScore = 0;
    let maxPossible = 0;
    let passCount = 0;
    let failCount = 0;

    checklistItems.forEach(item => {
      const s = Number(item.score) || 0;
      const m = Number(item.maxScore) || 10;
      totalScore += s;
      maxPossible += m;
      if (s === m) passCount++;
      else if (s === 0) failCount++;
    });

    const percent = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 100;
    return { totalScore, maxPossible, passCount, failCount, percent };
  };

  const stats = getLiveScoreStats();

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* Active Audit Execution View */}
      {activeAudit ? (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-6 animate-fadeIn">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-2">
              <button 
                onClick={handleExitAuditMode}
                className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <ArrowLeft size={14} /> Back to Audit Index
              </button>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2">
                <Play className="text-teal-600 fill-teal-600 animate-pulse" size={20} />
                Executing Inspection Checklist
              </h1>
              <p className="text-sm font-medium text-slate-700 mt-1">
                Customer: <span className="font-bold text-slate-900">{activeAudit.customerId?.companyName || "Standard Client"}</span> ({activeAudit.customerId?.code || "FCSC"})
              </p>
              <p className="text-xs text-slate-500 font-light">
                Facility site address: {activeAudit.siteId?.siteName || "Central Processing Facility"} — {activeAudit.siteId?.address || "Quality Way"}, {activeAudit.siteId?.city || "City"}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveAudit(true)}
                disabled={loading || checklistItems.length === 0}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
              >
                <Save size={14} /> Save Draft
              </button>
              <button
                onClick={() => handleSaveAudit(false)}
                disabled={loading || checklistItems.length === 0}
                className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
              >
                <Send size={14} /> Submit to Reviewer
              </button>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="flex bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm gap-2">
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
              <div>{errorMsg}</div>
            </div>
          )}
          {successMsg && (
            <div className="flex bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Live Compliance Statistics Summary Bar */}
          {checklistItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-900 text-white shadow-md">
              <div className="space-y-1 text-center sm:text-left border-r border-slate-800 pr-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Points</span>
                <p className="text-xl font-black text-white">{checklistItems.length} Checklist Items</p>
              </div>

              <div className="space-y-1 text-center sm:text-left border-r border-slate-800 pr-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">Passed (YES ✔️)</span>
                <p className="text-xl font-black text-emerald-400">{stats.passCount} Points</p>
              </div>

              <div className="space-y-1 text-center sm:text-left border-r border-slate-800 pr-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-400">Failed / Cross (NO ❌)</span>
                <p className="text-xl font-black text-rose-400">{stats.failCount} Defect Points</p>
              </div>

              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-teal-300">Live Audit Score</span>
                <p className="text-2xl font-black text-teal-300">{stats.percent}%</p>
              </div>
            </div>
          )}

          {/* Checklist selector if not already linked */}
          {checklistItems.length === 0 ? (
            <div className="max-w-2xl mx-auto p-6 border border-indigo-100 rounded-3xl bg-indigo-50/20 text-center space-y-4">
              <Layers className="text-indigo-500 mx-auto" size={32} />
              <div>
                <h3 className="font-bold text-slate-800">Select Customer Audit Checklist</h3>
                <p className="text-xs text-slate-500 mt-1">This audit record has no active questions. Link a checklist uploaded by the customer to start.</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <select
                  value={selectedChecklistId}
                  onChange={(e) => setSelectedChecklistId(e.target.value)}
                  className="rounded-xl border border-slate-300 p-2.5 bg-white text-xs max-w-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose uploaded format --</option>
                  {checklists.map((chk) => (
                    <option key={chk._id} value={chk._id}>
                      {chk.name} ({chk.standard} - {chk.items?.length || 0} items)
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleLinkChecklist}
                  className="py-2.5 px-4 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                >
                  Apply Checklist Items
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Question list Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs table-fixed">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 w-12 text-center">#</th>
                        <th className="py-3.5 px-4 w-[150px]">Category</th>
                        <th className="py-3.5 px-4 w-[280px]">Checklist Point / Question</th>
                        <th className="py-3.5 px-4 w-[220px] text-center">1-Click Compliance (YES / NO)</th>
                        <th className="py-3.5 px-4 w-[110px] text-center">Score Grade</th>
                        <th className="py-3.5 px-4 w-[110px] text-center">Severity</th>
                        <th className="py-3.5 px-4 w-[220px]">Auditor Observation Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {checklistItems.map((item, idx) => {
                        const isPass = Number(item.score) === Number(item.maxScore);
                        const isFail = Number(item.score) === 0;

                        return (
                          <tr 
                            key={item.itemId || idx} 
                            className={`align-top transition-colors ${
                              isFail ? 'bg-rose-50/40' : isPass ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-bold pt-4">{idx + 1}</td>
                            
                            <td className="py-3.5 px-4 pt-4">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] break-keep truncate block text-center border border-slate-200">
                                {item.category || "General"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-slate-900 pt-4 leading-relaxed whitespace-normal break-words">
                              {item.question}
                            </td>

                            {/* 1-Click YES (✔️) / NO (❌ Cross) Compliance Button Group */}
                            <td className="py-3.5 px-4 text-center pt-3">
                              <div className="flex items-center justify-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                                
                                {/* YES Button (Pass) */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleCompliance(idx, "YES")}
                                  className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                    isPass 
                                      ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400" 
                                      : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                                  }`}
                                >
                                  <Check size={14} className={isPass ? "stroke-[3]" : ""} />
                                  <span>YES</span>
                                </button>

                                {/* NO Button (Fail / Cross) */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleCompliance(idx, "NO")}
                                  className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                    isFail 
                                      ? "bg-rose-600 text-white shadow-md ring-2 ring-rose-400 animate-shake" 
                                      : "bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                                  }`}
                                >
                                  <X size={14} className={isFail ? "stroke-[3]" : ""} />
                                  <span>NO ❌</span>
                                </button>

                              </div>

                              {/* Row Status Indicator Tag */}
                              <div className="mt-1.5">
                                {isPass && (
                                  <span className="text-[10px] font-bold text-emerald-700 inline-flex items-center gap-0.5">
                                    <CheckCircle2 size={11} /> Pass (Compliant)
                                  </span>
                                )}
                                {isFail && (
                                  <span className="text-[10px] font-bold text-rose-700 inline-flex items-center gap-0.5">
                                    <XCircle size={11} /> Non-Compliant Cross
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Score Grade Dropdown */}
                            <td className="py-3.5 px-4 text-center select-none pt-3.5">
                              <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 justify-center w-full">
                                <select
                                  value={item.score}
                                  onChange={(e) => handleAnswerChange(idx, "score", Number(e.target.value))}
                                  className="bg-white border rounded p-1 text-[11px] font-bold text-slate-800 focus:outline-none w-[50px] text-center"
                                >
                                  {Array.from({ length: (item.maxScore || 10) + 1 }).map((_, i) => (
                                    <option key={i} value={i}>{i}</option>
                                  ))}
                                </select>
                                <span className="text-slate-400 font-light">/ {item.maxScore || 10}</span>
                              </div>
                            </td>

                            {/* Severity Level */}
                            <td className="py-3.5 px-4 text-center pt-3.5">
                              <select
                                value={item.severity}
                                onChange={(e) => handleAnswerChange(idx, "severity", e.target.value)}
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

                            {/* Observations */}
                            <td className="py-3.5 px-4 pt-3">
                              <textarea
                                rows={1}
                                value={item.comment}
                                placeholder={isFail ? "Describe non-conformity or defect details..." : "Auditor notes..."}
                                onChange={(e) => handleAnswerChange(idx, "comment", e.target.value)}
                                className={`w-full p-2 border rounded-xl text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-y ${
                                  isFail ? 'bg-rose-50/70 border-rose-200 placeholder-rose-400 font-medium' : 'bg-slate-50 border-slate-200 placeholder-slate-400'
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Extra overall notes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Overall Inspection Summary Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  placeholder="Record summary remarks, facility health level, etc."
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-4 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Action bar */}
              <div className="flex border-t border-slate-100 pt-5 justify-end gap-3">
                <button
                  onClick={handleExitAuditMode}
                  className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  Discard Draft Changes &amp; Exit
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAudit(true)}
                  className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-colors"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAudit(false)}
                  className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-md transition-colors"
                >
                  Complete &amp; Submit for QA Review
                </button>
              </div>

            </div>
          )}
        </div>
      ) : (
        // Standard auditor task lists page
        <div className="space-y-8">
          
          {/* Welcome Banner */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl bg-white border border-slate-200">
            <div className="space-y-2 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                <ClipboardList size={14} className="text-emerald-700" />
                Field Compliance Auditor
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Auditor: {user?.name}</h1>
                <button
                  onClick={handleOpenProfile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  <User size={14} />
                  Edit Auditor Profile Details
                </button>
              </div>
              <p className="text-sm font-light text-slate-600 max-w-2xl">
                Review assigned audits, inspect uploaded customer checklists, perform field evaluations, and submit completed audit reports.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 items-center gap-3">
                <UserCheck className="text-emerald-700" size={24} />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Assigned Tasks</h4>
                  <p className="text-[10px] text-slate-500">Pick any pending inspection assignment below.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="flex bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm gap-2">
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
              <div>{errorMsg}</div>
            </div>
          )}
          {successMsg && (
            <div className="flex bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Layout Grid (Scheduler left, Schedule lists right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Quick Test Audit Scheduler (Left Sidebar) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 bg-white border border-slate-200 shadow-md">
                <div>
                  <h2 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="text-emerald-700" size={18} />
                    Schedule Test Audit
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-1">Schedule an inspection draft instantly to perform tests.</p>
                </div>

                <form onSubmit={handleScheduleAudit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client Company</label>
                    <select
                      value={selectedCust}
                      onChange={(e) => setSelectedCust(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    >
                      <option value="">-- Choose Client (Optional) --</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.companyName} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inspection Facility Site</label>
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      disabled={!selectedCust}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white disabled:opacity-50"
                    >
                      <option value="">-- Choose Site Location (Optional) --</option>
                      {sites.map((st) => (
                        <option key={st._id} value={st._id}>
                          {st.siteName} ({st.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Checklist Format Selector */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                      <FileSpreadsheet size={12} />
                      Audit Checklist Format (Uploaded)
                    </label>
                    <select
                      value={formChecklistId}
                      onChange={(e) => setFormChecklistId(e.target.value)}
                      className="w-full p-2.5 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
                    >
                      <option value="">-- Attach Uploaded Checklist Format --</option>
                      {checklists.map((chk) => (
                        <option key={chk._id} value={chk._id}>
                          {chk.name} ({chk.items?.length || 0} questions)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inspection Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inspection Note</label>
                    <textarea
                      rows={2}
                      value={auditNotes}
                      placeholder="Audit scope details..."
                      onChange={(e) => setAuditNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={scheduleLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Calendar size={14} />
                    <span>Create Audit Assignment</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Inspections Task Table (Right Column) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Active Inspection Registers */}
              <div className="glass-panel p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h2 className="text-md font-bold text-slate-900 tracking-tight">Active Inspection Registers</h2>
                  <p className="text-xs text-slate-500">Scheduled audits pending evaluation or reviewer comments</p>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Fetching audits...</div>
                ) : audits.length === 0 ? (
                  <div className="py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    No active audit assignments. Click "Use to Audit" on any uploaded checklist below to start immediately!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {audits.map((aud) => (
                      <div key={aud._id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-700">{aud.auditRef}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                              aud.status === 'APPROVED' ? 'bg-emerald-100 border-emerald-200 text-emerald-750' :
                              aud.status === 'UNDER_REVIEW' ? 'bg-purple-100 border-purple-200 text-purple-700' :
                              aud.status === 'IN_PROGRESS' ? 'bg-amber-100 border-amber-200 text-amber-700 animate-pulse' :
                              'bg-blue-100 border-blue-200 text-blue-700'
                            }`}>
                              {aud.status.replace("_", " ")}
                            </span>
                          </div>
                          
                          <div className="text-xs">
                            <h3 className="font-black text-slate-900 text-sm">{aud.customerId?.companyName || "Standard Client"}</h3>
                            <p className="text-slate-500 font-light mt-0.5">{aud.siteId?.siteName || "Central Facility"} — {aud.siteId?.city || "Site"}</p>
                          </div>
                          
                          {aud.checklistId && (
                            <p className="text-[10px] text-slate-600 font-semibold flex items-center gap-1">
                              <FileText size={12} className="text-emerald-700" />
                              Linked Checklist: {aud.checklistId.name} ({aud.answers?.length || 0} Items)
                            </p>
                          )}
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 p-3 pt-3 md:p-0 border-slate-200 gap-2">
                          <div className="text-right text-xs">
                            <span className="text-[10px] text-slate-400 block font-semibold">Planned Date</span>
                            <span className="font-bold text-slate-700">{aud.scheduledDate ? new Date(aud.scheduledDate).toLocaleDateString() : ""}</span>
                          </div>
                          
                          {aud.status === 'APPROVED' && (
                            <div className="bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-lg border border-emerald-200 text-xs">
                              Score: {aud.score}%
                            </div>
                          )}

                          {["SCHEDULED", "IN_PROGRESS"].includes(aud.status) && (
                            <button
                              onClick={() => startAuditExecution(aud)}
                              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              <Play size={12} fill="white" className="stroke-none" />
                              <span>{aud.status === "IN_PROGRESS" ? "Resume Audit" : "Perform Audit"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Uploaded Checklists Repository Section */}
              <div className="glass-panel p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-md font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <FileSpreadsheet className="text-emerald-600" size={18} />
                      Uploaded Checklists Repository ({checklists.length})
                    </h2>
                    <p className="text-xs text-slate-500">Master audit formats uploaded by clients and administrators</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Ready for Field Use
                  </span>
                </div>

                {checklists.length === 0 ? (
                  <div className="py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    No uploaded checklists found in system.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {checklists.map((chk) => (
                      <div key={chk._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between hover:bg-slate-50 transition-colors">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                              {chk.standard || "FSSAI"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {chk.fileName || "Excel format"}
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-xs leading-snug">{chk.name}</h3>
                          <p className="text-[11px] text-slate-500 line-clamp-2">{chk.description || "No description provided."}</p>

                          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-600 font-medium">
                            <span className="flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 size={13} />
                              {chk.items?.length || 0} Questions
                            </span>
                            {chk.customerId && (
                              <span className="text-slate-500">
                                Client: {chk.customerId.companyName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => setPreviewChecklist(chk)}
                            className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Eye size={13} />
                            <span>Preview Questions</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLaunchAuditFromChecklist(chk)}
                            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105"
                          >
                            <Play size={12} fill="white" className="stroke-none" />
                            <span>Use to Audit 🚀</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
            
          </div>

        </div>
      )}

      {/* Checklist Question Preview Modal */}
      {previewChecklist && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-400 text-slate-950 uppercase">
                    {previewChecklist.standard || "FSSAI"}
                  </span>
                  <span className="text-xs text-emerald-200 font-medium">
                    {previewChecklist.items?.length || 0} Questions Parsed
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-white">{previewChecklist.name}</h2>
                <p className="text-xs text-slate-300 font-light">{previewChecklist.description}</p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewChecklist(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Question Table Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 w-[160px]">Category</th>
                    <th className="py-3 px-4">Checklist Question</th>
                    <th className="py-3 px-4 w-20 text-center">Max Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(previewChecklist.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[10px] block text-center border border-emerald-200">
                          {item.category || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-normal break-words leading-relaxed">
                        {item.question}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">
                        {item.maxScore || 10} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                File: <span className="font-bold text-slate-700">{previewChecklist.fileName || "Uploaded Format"}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const chk = previewChecklist;
                  setPreviewChecklist(null);
                  handleLaunchAuditFromChecklist(chk);
                }}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={13} fill="white" className="stroke-none" />
                Launch &amp; Start Audit Now 🚀
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Auditor Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={20} />
                <h3 className="font-bold text-base">Auditor Profile &amp; MongoDB Details</h3>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+1 555-0199"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Auditor ID Code</label>
                  <input
                    type="text"
                    value={profileForm.auditorIdCode}
                    onChange={(e) => setProfileForm({ ...profileForm, auditorIdCode: e.target.value })}
                    placeholder="AUD-REG-1042"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    value={profileForm.experienceYears}
                    onChange={(e) => setProfileForm({ ...profileForm, experienceYears: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialization Standard</label>
                  <input
                    type="text"
                    value={profileForm.specialization}
                    onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                    placeholder="FSSAI, ISO 22000, HACCP, BRCGS"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qualification / Degree</label>
                  <input
                    type="text"
                    value={profileForm.qualification}
                    onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })}
                    placeholder="B.Tech Food Tech / M.Sc Microbiology"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Certifications (comma separated)</label>
                <input
                  type="text"
                  value={profileForm.certifications}
                  onChange={(e) => setProfileForm({ ...profileForm, certifications: e.target.value })}
                  placeholder="Lead Auditor ISO 22000, FSSAI Certified Master Trainer, HACCP Professional"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address / Region</label>
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  placeholder="HQ North Region, Industrial Hub"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Auditor Bio &amp; Professional Summary</label>
                <textarea
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Certified lead auditor specializing in food safety management systems and manufacturing hygiene audits..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  {savingProfile ? "Saving to MongoDB..." : "Save Auditor Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuditorDashboard;
