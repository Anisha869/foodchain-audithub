import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuditorNavbar } from "@/components/AuditorNavbar";

export const metadata: Metadata = {
  title: "VERA Audit PWA | Second-Party Food Safety Auditor Workspace",
  description: "Auditor, Expert Reviewer, and Administrative Platform for FSSAI Annex 5 AI Verification, Forensic Fraud Analysis, and Certified Dossier Release.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VERA Audit",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex flex-col min-h-screen">
            <AuditorNavbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>VERA Ecosystem — Auditor, Reviewer & Dispatch Console</span>
                <span className="font-mono text-[11px] text-slate-400">Standard: FSSAI Schedule 4 / Annex 5</span>
              </div>
            </footer>
          </div>
        </ThemeProvider>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Audit PWA ServiceWorker registered with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('Audit PWA ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
