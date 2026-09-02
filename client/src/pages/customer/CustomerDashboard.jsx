import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../services/api.js";
import { 
  Building2, 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock, 
  BadgeAlert, 
  Calendar, 
  FileSpreadsheet, 
  Sparkles,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  Award,
  ChevronRight,
  TrendingUp,
  FileCheck
} from "lucide-react";

const CustomerDashboard = () => {
  const { user } = useAuth();
  
  // States
  const [checklists, setChecklists] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Upload form state
  const [checklistName, setChecklistName] = useState("");
  const [checklistStandard, setChecklistStandard] = useState("FSSAI");
  const [checklistDesc, setChecklistDesc] = useState("");
  const [file, setFile] = useState(null);
  
  // Selected checklist modal
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  
  // Selected audit details modal
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Fetch initial dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const checklistsRes = await api.get("/checklists");
      setChecklists(checklistsRes.data.checklists || []);
      
      const auditsRes = await api.get("/audits");
      setAudits(auditsRes.data.audits || []);
      setErrorMessage("");
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setErrorMessage("Could not load dashboard data from server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle file change
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Upload checklist
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Please select a PDF or Excel checklist document to upload.");
      return;
    }
    if (!checklistName.trim()) {
      setErrorMessage("Please assign a name for this checklist.");
      return;
    }

    try {
      setSubmitLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      
      const formData = new FormData();
      formData.append("name", checklistName.trim());
      formData.append("standard", checklistStandard);
      formData.append("description", checklistDesc.trim());
      formData.append("file", file);

      const { data } = await api.post("/checklists", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setSuccessMessage(data.message || "Auditing checklist uploaded and automatically parsed successfully!");
      setChecklistName("");
      setChecklistDesc("");
      setFile(null);
      
      // Reset file input in HTML
      const fileInput = document.getElementById("checklist-file-input");
      if (fileInput) fileInput.value = "";
      
      // Refresh list
      loadDashboardData();
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMessage(err.response?.data?.message || "File upload failed. Ensure server is online and file format is valid Excel/PDF.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete checklist
  const handleDeleteChecklist = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the checklist "${name}"?`)) {
      return;
    }
    try {
      await api.delete(`/checklists/${id}`);
      setSuccessMessage("Checklist deleted successfully.");
      loadDashboardData();
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMessage("Could not delete checklist. Please review connection.");
    }
  };

  // Calculate statistics
  const totalUploaded = checklists.length;
  const compliantAudits = audits.filter(a => a.status === "APPROVED");
  const averageScore = compliantAudits.length > 0
    ? Math.round(compliantAudits.reduce((acc, curr) => acc + (curr.score || 0), 0) / compliantAudits.length)
    : "No audits";
  const inProgressAuditCount = audits.filter(a => ["IN_PROGRESS", "UNDER_REVIEW"].includes(a.status)).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl bg-white border border-slate-200">
        <div className="space-y-3 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
            <Building2 size={14} className="text-indigo-600" />
            Client Compliance Hub
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Compliance Dashboard: {user?.name}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl font-light">
            Upload your regulatory checklists in Excel or PDF format, monitor real-time AI parsing, and view auditor scores & Technical Review sign-offs.
          </p>
        </div>
        <div className="flex z-10 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 items-center gap-3">
          <Sparkles className="text-indigo-600 shrink-0" size={24} />
          <div>
            <h4 className="text-xs font-bold text-slate-800">Auto-Extract Engine</h4>
            <p className="text-[11px] text-slate-500">PDFs & Excels are converted to structured tables instantly.</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="flex bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-sm gap-2 animate-fadeIn">
          <AlertTriangle size={18} className="shrink-0 text-rose-600" />
          <div>{errorMessage}</div>
        </div>
      )}
      {successMessage && (
        <div className="flex bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-sm gap-2 animate-fadeIn">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <div>{successMessage}</div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl space-y-2 bg-white border border-slate-200 hover:border-indigo-400 transition-all flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Average Audit Score</span>
            <p className="text-4xl font-black text-slate-900 mt-2">
              {typeof averageScore === "number" ? `${averageScore}%` : averageScore}
            </p>
          </div>
          <div className="pt-2 text-xs text-indigo-600 font-semibold flex items-center gap-1">
            <Award size={14} /> Based on completed records
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl space-y-2 bg-white border border-slate-200 hover:border-indigo-400 transition-all flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Uploaded Checklists</span>
            <p className="text-4xl font-black text-indigo-700 mt-2">{totalUploaded}</p>
          </div>
          <div className="pt-2 text-xs text-indigo-600 font-semibold flex items-center gap-1">
            <FileText size={14} /> Available to auditors & reviewers
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl space-y-2 bg-white border border-slate-200 hover:border-indigo-400 transition-all flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active Facility Audits</span>
            <p className="text-4xl font-black text-amber-700 mt-2">{inProgressAuditCount}</p>
          </div>
          <div className="pt-2 text-xs text-amber-600 font-medium flex items-center gap-1">
            <Clock size={14} /> Scheduled or in review
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Upload Form (Left Column) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 bg-white border border-slate-200 shadow-xl">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Upload className="text-indigo-600" size={20} />
                Upload New Checklist
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload your facility checklist and let the system structure it.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Checklist Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FSSAI Catering Standards"
                  value={checklistName}
                  onChange={(e) => setChecklistName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Compliance Type</label>
                  <select
                    value={checklistStandard}
                    onChange={(e) => setChecklistStandard(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="FSSAI">FSSAI (India)</option>
                    <option value="HACCP">HACCP</option>
                    <option value="ISO 22000">ISO 22000</option>
                    <option value="BRCGS">BRCGS</option>
                    <option value="Internal Quality">Internal Quality</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Supports</label>
                  <div className="p-3 bg-indigo-50/50 text-indigo-700 rounded-2xl text-xs font-medium text-center border border-indigo-100 flex items-center justify-center gap-1">
                    <FileSpreadsheet size={14} /> PDF &amp; Excel sheets
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide scope details (e.g. warehouse cleaning regime)"
                  value={checklistDesc}
                  onChange={(e) => setChecklistDesc(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Upload File</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors relative">
                  <input
                    type="file"
                    id="checklist-file-input"
                    accept=".pdf,.xlsx,.xls"
                    onChange={handleFileChange}
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        {file ? file.name : "Drag & drop or click to upload"}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">PDF, XLSX, or XLS up to 10MB</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-2xl text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Parsing File Content...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={16} />
                    <span>Upload &amp; Generate Checklist</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Checklists & Audits (Right Column) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Uploaded Checklists Table */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Active Checklists</h2>
              <p className="text-xs text-slate-500">Checklists parsed and shared with the inspection teams</p>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500 text-xs">Loading checklists...</div>
            ) : checklists.length === 0 ? (
              <div className="py-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-xs">
                No checklists uploaded yet. Create your first safety list above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Compliance Type</th>
                      <th className="py-3 px-4">Parsed Qs</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {checklists.map((chk) => (
                      <tr key={chk._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div>
                            <p>{chk.name}</p>
                            <p className="text-[10px] text-slate-400 font-light truncate max-w-[180px]">{chk.fileName || "N/A"}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-55 bg-indigo-50 border border-indigo-100 text-indigo-700 uppercase">
                            {chk.standard}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {chk.items?.length || 0} items
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedChecklist(chk);
                                setShowChecklistModal(true);
                              }}
                              title="View Parsed Items Table"
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteChecklist(chk._id, chk.name)}
                              title="Delete Checklist"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Reports queue */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Audit Progress &amp; Reports</h2>
              <p className="text-xs text-slate-500">Inspection status, auditor grading records, and Quality signoff</p>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500 text-xs">Loading audit schedules...</div>
            ) : audits.length === 0 ? (
              <div className="py-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-xs">
                No scheduled audits are registered. Start by scheduling an audit with the Planner.
              </div>
            ) : (
              <div className="space-y-4">
                {audits.map((aud) => (
                  <div key={aud._id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600">{aud.auditRef}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            aud.status === 'APPROVED' ? 'bg-emerald-15 bg-emerald-50 text-emerald-700 border-emerald-100' :
                            aud.status === 'UNDER_REVIEW' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                            aud.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                            'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                            {aud.status.replace("_", " ")}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm mt-1">{aud.siteId?.siteName || "Facility Site"}</h4>
                        <p className="text-[10px] text-slate-500">{aud.siteId?.city}, {aud.siteId?.state}</p>
                      </div>
                      
                      <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-1">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar size={12} /> {aud.scheduledDate ? new Date(aud.scheduledDate).toLocaleDateString() : ""}
                        </span>
                        
                        {aud.status === 'APPROVED' ? (
                          <div className="bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-xl text-sm flex items-center gap-1 mt-1">
                            <TrendingUp size={14} />
                            <span>{aud.score}%</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Pending Grade</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 text-xs">
                      <span className="text-[11px] text-slate-650">
                        {aud.checklistId ? (
                          <span className="font-medium text-slate-700 flex items-center gap-1">
                            <FileCheck size={13} className="text-indigo-500" />
                            {aud.checklistId.name} ({aud.answers?.length || 0} Qs)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No checklist linked yet</span>
                        )}
                      </span>
                      
                      {aud.answers && aud.answers.length > 0 && (
                        <button
                          onClick={() => {
                            setSelectedAudit(aud);
                            setShowAuditModal(true);
                          }}
                          className="py-1 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                        >
                          View Results Table <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Checklist parsed items Modal */}
      {showChecklistModal && selectedChecklist && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  {selectedChecklist.standard} Standard
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedChecklist.name}</h3>
                <p className="text-xs text-slate-500 mt-1 italic">{selectedChecklist.description}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Original File: {selectedChecklist.fileName} ({Math.round(selectedChecklist.fileSize/1024)} KB)</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedChecklist(null);
                  setShowChecklistModal(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-550 border-b border-slate-100 pb-2">
                <span>Total Extracted Items:</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-indigo-700">{selectedChecklist.items?.length || 0} Questions</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-15">
                    <tr>
                      <th className="py-2.5 px-3 w-12">#</th>
                      <th className="py-2.5 px-3">Scope / Category</th>
                      <th className="py-2.5 px-3">Extracted Checklist Item Question</th>
                      <th className="py-2.5 px-3 text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedChecklist.items?.map((item, idx) => (
                      <tr key={item._id || idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-650 font-medium">
                            {item.category || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">{item.question}</td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900">{item.maxScore} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setSelectedChecklist(null);
                  setShowChecklistModal(false);
                }}
                className="py-2 px-5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
              >
                Done viewing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Checklist details / report Modal */}
      {showAuditModal && selectedAudit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                    {selectedAudit.status}
                  </span>
                  <span className="font-mono text-xs text-slate-500 font-bold">Ref: {selectedAudit.auditRef}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">{selectedAudit.siteId?.siteName} — Findings Log</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedAudit.siteId?.address}, {selectedAudit.siteId?.city}, {selectedAudit.siteId?.state}</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedAudit(null);
                  setShowAuditModal(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Scorecard panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-50">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Overall Compliance Score</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-indigo-700">{selectedAudit.score}%</span>
                    <span className="text-xs text-slate-550">
                      ({selectedAudit.answers?.reduce((acc, c) => acc + c.score, 0)} / {selectedAudit.answers?.reduce((acc, c) => acc + c.maxScore, 0)} points)
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200/60 pt-3 md:pt-0 md:pl-5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Inspected By</span>
                  <p className="text-xs font-semibold text-slate-800">Field Inspection Auditor</p>
                  <p className="text-[10px] text-slate-500">Date: {new Date(selectedAudit.scheduledDate).toLocaleDateString()}</p>
                </div>

                <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200/60 pt-3 md:pt-0 md:pl-5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Reviewer Decision / Signoff</span>
                  <p className="text-xs font-semibold text-slate-800">Technical reviewer signoff completed</p>
                  <p className="text-[10px] text-slate-500 font-light truncate">Comments: {selectedAudit.reviewerComments || "No custom notes recorded."}</p>
                </div>
              </div>

              {/* Checklist grading tabular form */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Checklist score board</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Checklist Question</th>
                        <th className="py-2.5 px-3 text-center">Score</th>
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3">Evidence / Auditor Observation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedAudit.answers?.map((ans, idx) => (
                        <tr key={ans._id || idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-650 font-medium font-mono text-[10px]">
                              {ans.category || "General"}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800">{ans.question}</td>
                          <td className="py-3 px-3 text-center font-bold">
                            <span className={ans.score === ans.maxScore ? "text-emerald-600" : ans.score === 0 ? "text-rose-600" : "text-amber-600"}>
                              {ans.score} / {ans.maxScore}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              ans.severity === 'Critical' ? 'bg-rose-100 text-rose-700' :
                              ans.severity === 'Major' ? 'bg-amber-100 text-amber-700' :
                              ans.severity === 'Minor' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {ans.severity}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 italic max-w-[200px] truncate" title={ans.comment}>
                            {ans.comment || ans.evidence || <span className="text-slate-350">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setSelectedAudit(null);
                  setShowAuditModal(false);
                }}
                className="py-2 px-5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
              >
                Close scorecard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerDashboard;
