"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { 
  ShieldCheck, 
  LayoutDashboard, 
  ClipboardList, 
  Send, 
  FileCheck2, 
  Wifi, 
  WifiOff, 
  Menu, 
  X,
  LogOut,
  Building2
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check user session
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserEmail(data.user.email || "Customer");
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    router.push("/login");
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/checklists", label: "FSSAI Checklists", icon: ClipboardList },
    { href: "/request-audit", label: "Request Audit", icon: Send },
    { href: "/reports", label: "Released Reports", icon: FileCheck2 },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-700 to-indigo-900 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                  VERA
                </span>
                <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Customer
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Second-Party Food Safety</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Offline/Online Badge */}
            <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            }`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{isOnline ? "Online" : "Offline PWA"}</span>
            </div>

            <ThemeToggle />

            {userEmail ? (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{userEmail.split("@")[0]}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                    <Building2 size={10} /> Org Member
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-lg text-white bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 space-y-1 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          {userEmail ? (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <LogOut size={18} />
              Sign Out ({userEmail})
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center mt-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-700 text-white"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
