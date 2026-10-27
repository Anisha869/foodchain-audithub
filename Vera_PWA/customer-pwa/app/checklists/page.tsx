"use client";

import { useEffect, useState } from "react";
import { 
  ClipboardCheck, 
  Search, 
  AlertTriangle, 
  BookOpen, 
  FileText, 
  ChevronRight,
  Filter,
  CheckCircle2
} from "lucide-react";

export default function ChecklistsPage() {
  const [categories, setCategories] = useState<string[]>([
    "Catering",
    "General Manufacturing",
    "Milk Processing",
    "Meat Processing",
    "Slaughterhouse",
    "Retail",
    "Storage & Warehouse",
    "Transport"
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>("Catering");
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterAsteriskOnly, setFilterAsteriskOnly] = useState<boolean>(false);

  useEffect(() => {
    async function fetchChecklist() {
      setLoading(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/checklists/${encodeURIComponent(selectedCategory)}`);
        if (res.ok) {
          const data = await res.json();
          setChecklistItems(data.items || []);
        } else {
          // Fallback demo items
          loadFallback(selectedCategory);
        }
      } catch (err) {
        loadFallback(selectedCategory);
      } finally {
        setLoading(false);
      }
    }

    fetchChecklist();
  }, [selectedCategory]);

  const loadFallback = (cat: string) => {
    setChecklistItems([
      {
        item_id: "Cat_01",
        question: "Food establishment has an updated FSSAI license and is displayed at a prominent location.",
        section: "Design & Facilities",
        weight: 2,
        asterisk_critical: false
      },
      {
        item_id: "Cat_02",
        question: "The design of food premises provides adequate working space; permit maintenance & cleaning to prevent entry of dirt, dust & pests.",
        section: "Design & Facilities",
        weight: 2,
        asterisk_critical: false
      },
      {
        item_id: "Cat_07",
        question: "Water used in food preparation and ice making conforms to IS 10500 potable water standards.",
        section: "Design & Facilities",
        weight: 4,
        asterisk_critical: true
      },
      {
        item_id: "Cat_15",
        question: "Adequate separate temperature-controlled cold holding units (below 5°C) and hot holding units (above 65°C) are provided and calibrated.",
        section: "Control of Operations",
        weight: 4,
        asterisk_critical: true
      },
      {
        item_id: "Cat_22",
        question: "Food handlers undergo annual medical examinations and wear clean protective overalls, headgear, and footwear.",
        section: "Personnel Hygiene",
        weight: 2,
        asterisk_critical: false
      }
    ]);
  };

  const filtered = checklistItems.filter((item) => {
    const matchesSearch = 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.section && item.section.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAsterisk = filterAsteriskOnly ? item.asterisk_critical : true;
    return matchesSearch && matchesAsterisk;
  });

  const totalPoints = checklistItems.reduce((acc, it) => acc + Number(it.weight || 2), 0);
  const asteriskCount = checklistItems.filter((it) => it.asterisk_critical).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Official FSSAI Inspection Checklists
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Schedule 4 / Annex 5 Standard Inspection Requirements & Scoring Criteria
          </p>
        </div>

        {/* Category Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-xl">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold uppercase">Category</span>
            <div className="text-base font-black text-blue-950 dark:text-white">{selectedCategory}</div>
          </div>
          <div>
            <span className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold uppercase">Total Clauses</span>
            <div className="text-base font-black text-blue-950 dark:text-white">{checklistItems.length}</div>
          </div>
          <div>
            <span className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold uppercase">Total Weight</span>
            <div className="text-base font-black text-blue-950 dark:text-white">{totalPoints} Points</div>
          </div>
          <div>
            <span className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold uppercase">Asterisk Critical (*)</span>
            <div className="text-base font-black text-rose-600 dark:text-rose-400">{asteriskCount} Zero-Tolerance Items</div>
          </div>
        </div>

        {/* Note on Asterisk rule */}
        <div className="text-xs text-slate-600 dark:text-slate-300 max-w-md bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-blue-100 dark:border-blue-950">
          <strong className="text-rose-600">Regulatory Rule:</strong> Asterisk (*) items cannot receive Partial Compliance. Any partial non-conformance collapses directly to NC (0 points).
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clause text, item ID, or section..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <button
          onClick={() => setFilterAsteriskOnly(!filterAsteriskOnly)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            filterAsteriskOnly
              ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle size={14} className={filterAsteriskOnly ? "text-rose-600" : "text-slate-400"} />
          {filterAsteriskOnly ? "Showing Asterisk (*) Critical Only" : "Filter Asterisk (*) Items"}
        </button>
      </div>

      {/* Checklist Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading statutory requirements...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No clauses match your filter criteria.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((item, idx) => (
              <div key={item.item_id || idx} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0 w-16 pt-0.5">
                  {item.item_id}
                </span>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.section || "General"}
                    </span>
                    {item.asterisk_critical && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-900 flex items-center gap-1">
                        <AlertTriangle size={10} /> Critical (*)
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      Weight: <strong>{item.weight} Marks</strong>
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {item.question}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
