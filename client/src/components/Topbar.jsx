import React from "react";
import { Menu, LogOut, User as UserIcon, Shield, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

const ROLE_LABEL = {
  admin: "Admin / Audit Planner",
  auditor: "Field Auditor",
  reviewer: "Technical Reviewer",
  customer: "Customer / Facility",
};

const Topbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2.5 -ml-2 rounded-2xl text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <div className="hidden sm:block">
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{ROLE_LABEL[user?.role] || "Dashboard"}</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">
              <CheckCircle size={12} className="text-teal-600" />
              Active Session
            </span>
          </h2>
          <p className="text-xs text-slate-500">Connected to MongoDB Atlas Workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User Account Capsule */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-100 border border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-bold text-slate-900 leading-tight max-w-[140px] truncate">{user?.name}</p>
            <p className="text-[10px] font-medium text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-700 bg-rose-100 border border-rose-200 hover:bg-rose-200 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;

