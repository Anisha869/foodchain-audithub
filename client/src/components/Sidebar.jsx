import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Building2,
  ClipboardList,
  ClipboardCheck,
  FileCheck2,
  CheckSquare,
  FileText,
  PieChart,
  SlidersHorizontal,
  X
} from "lucide-react";

const NAV_BY_ROLE = {
  admin: [
    { to: "/admin/dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
  ],
  auditor: [
    { to: "/auditor/dashboard", label: "Field Audit Execution", icon: ClipboardList },
  ],
  reviewer: [
    { to: "/reviewer/dashboard", label: "Technical Review Queue", icon: ClipboardCheck },
  ],
  customer: [
    { to: "/customer/dashboard", label: "Customer Portal", icon: FileCheck2 },
  ],
};

const Sidebar = ({ role, open, onClose }) => {
  const items = NAV_BY_ROLE[role] || [];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-emerald-950/70 backdrop-blur-md lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed z-50 inset-y-0 left-0 w-72 bg-emerald-950 text-slate-100 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col justify-between
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:inset-auto`}
      >
        <div>
          {/* Header Branding */}
          <div className="flex items-center justify-between px-6 h-20 border-b border-emerald-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-400 text-emerald-950 shadow-sm">
                <ShieldCheck size={26} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-base font-extrabold leading-tight text-white tracking-tight">FoodChain <span className="text-emerald-300">AuditHub</span></p>
                <p className="text-[11px] text-emerald-200 font-medium leading-tight mt-0.5">Enterprise Compliance</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl text-slate-100 hover:text-white hover:bg-emerald-900/50"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Role Banner */}
          <div className="mx-4 my-4 p-3 rounded-2xl bg-emerald-900 border border-emerald-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Role Scope</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-950 bg-emerald-200 border border-emerald-300 px-2.5 py-0.5 rounded-full uppercase">
              {role}
            </span>
          </div>

          {/* Nav Items */}
          <nav className="px-4 space-y-1.5">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 group relative
                  ${isActive 
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-sm"
                    : "text-emerald-200 hover:text-white hover:bg-emerald-900/40 border border-transparent"}`
                }
              >
                <Icon size={20} className="shrink-0 transition-transform group-hover:scale-110" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer info card */}
        <div className="p-4 border-t border-emerald-700">
          <div className="p-3.5 rounded-2xl bg-emerald-900 border border-emerald-700 text-xs text-emerald-200 space-y-1">
            <div className="flex items-center justify-between font-semibold text-white">
              <span>System Status</span>
              <span className="text-emerald-950 text-[10px] bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-full">Operational</span>
            </div>
            <p className="text-[11px] text-emerald-300">MongoDB Atlas Live Sync</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

