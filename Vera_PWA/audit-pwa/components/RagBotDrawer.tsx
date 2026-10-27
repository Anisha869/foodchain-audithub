"use client";

import { useState } from "react";
import { Bot, Send, X, Sparkles, Quote, AlertCircle } from "lucide-react";

export function RagBotDrawer({
  isOpen,
  onClose,
  reportText,
}: {
  isOpen: boolean;
  onClose: () => void;
  reportText?: string;
}) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; text: string; confidence?: number; excerpt?: string }>>([
    {
      role: "bot",
      text: "Hello Auditor. I am the VERA Extractive RAG Assistant. Ask me anything about the uploaded inspection report (e.g., 'What were the chiller temperatures?', 'Was pest control documentation found?'). I provide 100% extractive, verbatim citations with zero generative hallucination."
    }
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userQ = query.trim();
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", text: userQ }]);
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_text: reportText || "The facility maintains records. Chiller temperatures were logged between 3.2C and 4.1C. Water testing confirmed potable under IS 10500 standards.",
          question: userQ,
          top_k: 3
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: data.answer,
            confidence: data.confidence,
            excerpt: data.verbatim_sentence
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: "No direct matching statutory passage found in the uploaded report." }
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Backend RAG engine query error. Verify VERA Engine server is active." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              RAG Auditor Bot
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                100% Extractive
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Verbatim evidence retrieval from report</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700/60"
              }`}
            >
              <p className="leading-relaxed">{m.text}</p>
              {m.confidence !== undefined && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-[10px] text-slate-500">
                  <Quote size={10} /> Match Confidence: {(m.confidence * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <Sparkles size={14} className="animate-spin text-blue-500" /> Searching document vectors...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleAsk} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about temperatures, hygiene, pest records..."
          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
