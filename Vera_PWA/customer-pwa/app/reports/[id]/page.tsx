"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Download, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  FileText,
  Lock,
  Printer
} from "lucide-react";
import { ComplianceBadge } from "@/components/StatusBadge";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from "recharts";

export default function ReleasedReportDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const auditId = resolvedParams.id;

  const [dossier, setDossier] = useState<any>({
    report_id: "REP-2026-FSSAI-00412",
    audit_id: auditId,
    facility_name: "Unit 1 - Central Kitchen (Bengaluru)",
    facility_address: "Plot 42, Peenya Industrial Area, Phase II, Bengaluru",
    category: "Catering",
    standard: "FSSAI Schedule 4 / Annex 5 Standard",
    inspection_date: "2026-10-14",
    release_date: "2026-10-18",
    lead_auditor: "Dr. Rajesh Iyer (FSSAI Certified Lead Auditor #4412)",
    expert_reviewer: "S. Swaminathan (Senior Food Safety Reviewer)",
    total_awarded: 104,
    total_max: 114,
    percentage: 91.23,
    grade: "A+",
    status_label: "Compliance – Exemplar",
    sha256_hash: "a9f84bc91e70e281bb872fa99812cc9318b74ff025b96e4811a437c98e1fae92",
    sections: [
      { name: "Design & Facilities", awarded: 22, max: 24, percentage: 91.6 },
      { name: "Control of Operations", awarded: 36, max: 40, percentage: 90.0 },
      { name: "Maintenance & Sanitation", awarded: 20, max: 22, percentage: 90.9 },
      { name: "Personal Hygiene", awarded: 16, max: 16, percentage: 100.0 },
      { name: "Training & Records", awarded: 10, max: 12, percentage: 83.3 }
    ],
    approved_findings: [
      {
        item_id: "Cat_01",
        question: "Food establishment has an updated FSSAI license and is displayed at a prominent location.",
        section: "Design & Facilities",
        weight: 2,
        asterisk_critical: false,
        status: "C",
        points_awarded: 2,
        evidence: "FSSAI Central License #10020033000412 prominently framed and displayed in the main reception and dispatch corridor."
      },
      {
        item_id: "Cat_07",
        question: "Water used in food preparation and ice making conforms to IS 10500 potable water standards.",
        section: "Design & Facilities",
        weight: 4,
        asterisk_critical: true,
        status: "C",
        points_awarded: 4,
        evidence: "Comprehensive monthly NABL-accredited water test reports dated 2026-09-28 verified; microbiological and chemical parameters fully conform to IS 10500."
      },
      {
        item_id: "Cat_15",
        question: "Adequate separate temperature-controlled cold holding units (below 5°C) and hot holding units (above 65°C) are provided and calibrated.",
        section: "Control of Operations",
        weight: 4,
        asterisk_critical: true,
        status: "C",
        points_awarded: 4,
        evidence: "Continuous digital data loggers in walk-in chillers logged steady 3.2°C to 4.1°C; calibration certificates from calibrated agency valid until 2027."
      },
      {
        item_id: "Cat_18",
        question: "Food contact surfaces and utensils are smooth, non-corrosive, non-toxic, and kept in good repair.",
        section: "Control of Operations",
        weight: 2,
        asterisk_critical: false,
        status: "PC",
        points_awarded: 1,
        evidence: "SS-304 preparation tables in good repair; minor surface pitting noted on two auxiliary stainless steel dough trays in bakery corner."
      },
      {
        item_id: "Cat_24",
        question: "Properly calibrated dial/digital thermometers are available and utilized for temperature monitoring of high-risk items.",
        section: "Control of Operations",
        weight: 2,
        asterisk_critical: false,
        status: "NC",
        points_awarded: 0,
        evidence: "One infrared probe thermometer at dispatch bay was found out of calibration since August 2026 without secondary reference check."
      }
    ]
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VERA_Audit_${dossier.report_id}.json`;
    a.click();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600"
        >
          <ArrowLeft size={16} /> Back to Released Reports
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Dossier
          </button>
          <button
            onClick={handleDownloadJSON}
            className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            <Download size={14} /> Export Certified JSON
          </button>
        </div>
      </div>

      {/* Official Certificate Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Certificate Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
              <ShieldCheck size={18} /> Official Certified Audit Dossier
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              Second-Party Food Safety Inspection Certificate
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Dossier ID: {dossier.report_id} | Standard: {dossier.standard}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 text-center sm:text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Compliance Grade</span>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {dossier.grade}
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {dossier.percentage}% ({dossier.status_label})
            </div>
          </div>
        </div>

        {/* Facility & Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Audited Facility</span>
            <div className="font-bold text-slate-900 dark:text-white mt-0.5">{dossier.facility_name}</div>
            <div className="text-[10px] text-slate-500">{dossier.facility_address}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Statutory Category</span>
            <div className="font-bold text-slate-900 dark:text-white mt-0.5">{dossier.category}</div>
            <div className="text-[10px] text-slate-500">Inspection: {dossier.inspection_date}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Lead Auditor</span>
            <div className="font-bold text-slate-900 dark:text-white mt-0.5">{dossier.lead_auditor}</div>
            <div className="text-[10px] text-slate-500">Certified Auditor</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Expert Reviewer</span>
            <div className="font-bold text-slate-900 dark:text-white mt-0.5">{dossier.expert_reviewer}</div>
            <div className="text-[10px] text-emerald-600 font-semibold">Released {dossier.release_date}</div>
          </div>
        </div>

        {/* Section Breakdown Recharts Bar Chart */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Section-Wise Compliance Breakdown (Percentage %)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Annex 5 Categories</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dossier.sections} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, 'Compliance']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                />
                <Bar dataKey="percentage" radius={[0, 8, 8, 0]}>
                  {dossier.sections.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.percentage >= 90 ? '#10b981' : entry.percentage >= 80 ? '#3b82f6' : '#f59e0b'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Approved Regulatory Findings Table */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Approved Clause-Level Audit Findings ({dossier.approved_findings.length} Sample Clauses Shown)
          </h3>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {dossier.approved_findings.map((item: any) => (
                <div key={item.item_id} className="p-4 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-blue-600">{item.item_id}</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">{item.section}</span>
                      {item.asterisk_critical && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          Critical (*)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <ComplianceBadge status={item.status} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {item.points_awarded} / {item.weight} Pts
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{item.question}</p>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800/60">
                    <strong className="text-slate-800 dark:text-slate-200">Verified Evidence: </strong>
                    {item.evidence}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SHA-256 Tamper-Evident Footer */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <Lock size={12} className="text-emerald-500" /> Tamper-Proof Cryptographic Provenance
          </div>
          <p className="text-[11px] text-slate-400">
            This certified audit dossier is sealed under SHA-256 session provenance. Any unauthorized modification to scores, clause verdicts, or evidence invalidates this certificate.
          </p>
          <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 pt-1 break-all">
            HASH: {dossier.sha256_hash}
          </div>
        </div>
      </div>
    </div>
  );
}
