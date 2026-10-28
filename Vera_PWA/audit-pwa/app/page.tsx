"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/audits");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-xs text-slate-400">
      Loading VERA Audit Workspace...
    </div>
  );
}
