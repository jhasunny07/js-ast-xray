"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import {
  Zap,
  Code2,
  Database,
  RotateCcw,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertCircle,
  Terminal,
  Activity,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react";
import { processCode } from "@/lib/engine";

const ASTNode = ({
  node,
  name,
  activeLine,
  stepIndex,
  executionHistory = [],
  isDarkMode,
}: any) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const startLine = node?.loc?.start?.line;
  const isActive = startLine === activeLine;
  const wasExecuted =
    Array.isArray(executionHistory) &&
    executionHistory.some((h: any) => h.line === startLine);
  const isPastStep = wasExecuted && !isActive;

  useEffect(() => {
    if (isActive && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isActive]);

  if (!node || typeof node !== "object") {
    const isBool = typeof node === "boolean";
    const isNum = typeof node === "number";

    return (
      <div className="flex items-center gap-2 ml-4 py-0.5 border-l border-current/10 pl-3">
        <span
          className={`text-[10px] font-mono font-medium ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
        >
          {name}:
        </span>
        <span
          className={`text-[10px] font-mono font-bold px-1 rounded ${
            isBool
              ? "bg-orange-500/20 text-orange-500"
              : isNum
                ? "bg-blue-500/20 text-blue-500"
                : isDarkMode
                  ? "text-emerald-400"
                  : "text-emerald-600"
          }`}
        >
          {String(node)}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={nodeRef}
      className={`ml-4 border-l ${isDarkMode ? "border-white/5" : "border-black/5"} relative transition-all duration-300`}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer rounded transition-all mb-0.5 border shadow-sm ${
          isActive
            ? "bg-yellow-400 text-black border-yellow-500 scale-[1.02] z-10"
            : isPastStep
              ? isDarkMode
                ? "bg-blue-900/40 text-blue-200 border-blue-500/30"
                : "bg-blue-50 text-blue-700 border-blue-200"
              : `text-gray-500 hover:bg-current/5 border-transparent`
        }`}
      >
        <span className="text-[9px] font-black w-3 text-center">
          {isExpanded ? "▼" : "▶"}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-tight ${
            isActive
              ? "text-black"
              : isPastStep
                ? isDarkMode
                  ? "text-blue-100"
                  : "text-blue-800"
                : isDarkMode
                  ? "text-pink-500"
                  : "text-pink-600"
          }`}
        >
          {node.type || "Node"}
        </span>
      </div>
      {isExpanded && (
        <div className="pb-1">
          {Object.entries(node).map(
            ([k, v]) =>
              !["loc", "start", "end"].includes(k) && (
                <ASTNode
                  key={k}
                  node={v}
                  name={k}
                  activeLine={activeLine}
                  stepIndex={stepIndex}
                  executionHistory={executionHistory}
                  isDarkMode={isDarkMode}
                />
              ),
          )}
        </div>
      )}
    </div>
  );
};

export default function XRayApp() {
  // --- HYDRATION FIX ---
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [code, setCode] = useState(
    'console.log("sunny");\n\nconsole.log(a);\nconst a = 10;',
  );
  const [data, setData] = useState<{ ast: any; logs: any[]; error: any }>({
    ast: null,
    logs: [],
    error: null,
  });
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setMounted(true); // Signal that client-side hydration is complete
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      const result = processCode(code);
      if (result.success) {
        try {
          const runtimeLogs = new Function(result.instrumented!)() || [];
          setData({ ast: result.ast, logs: runtimeLogs, error: null });
          setStep(0);
        } catch (e: any) {
          setData((prev) => ({
            ...prev,
            error: { type: "Runtime Error", message: e.message },
            logs: [],
          }));
        }
      } else {
        setData((prev) => ({
          ...prev,
          error: { type: "Syntax Error", message: result.error.message },
        }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [code, mounted]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && data.logs.length > 0) {
      interval = setInterval(() => {
        setStep((s) =>
          s < data.logs.length - 1 ? s + 1 : (setIsPlaying(false), s),
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, data.logs.length]);

  // Prevent rendering until mounted to avoid the hydration error
  if (!mounted) return <div className="h-screen w-screen bg-[#0a0c10]" />;

  const currentHistory = Array.isArray(data.logs)
    ? data.logs.slice(0, step)
    : [];

  return (
    <div
      className={`h-screen w-screen flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-[#0a0c10] text-gray-400" : "bg-gray-50 text-gray-600"} overflow-hidden font-sans`}
    >
      <nav
        className={`h-14 flex items-center justify-between px-6 border-b shrink-0 relative z-20 ${isDarkMode ? "bg-[#0f1218] border-white/5" : "bg-white border-gray-200 shadow-sm"}`}
      >
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-yellow-500" fill="currentColor" />
          <span
            className={`font-black text-[12px] tracking-[0.2em] uppercase italic ${isDarkMode ? "text-white" : "text-gray-900"}`}
          >
            JS-XRAY
          </span>
        </div>

        <div
          className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-1.5 rounded-2xl border shadow-xl ${isDarkMode ? "bg-[#1a1d24] border-white/10" : "bg-white border-gray-200"}`}
        >
          <button onClick={() => setStep(0)}>
            <RotateCcw size={14} />
          </button>
          <div className="flex items-center gap-1">
            <button
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="p-1 disabled:opacity-20"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl shadow-lg ${isPlaying ? "bg-red-500 text-white" : "bg-yellow-400 text-black"}`}
            >
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              disabled={step >= data.logs.length - 1}
              onClick={() => setStep((s) => s + 1)}
              className="p-1 disabled:opacity-20"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isDarkMode ? "bg-black/40 text-yellow-400" : "bg-gray-100 text-gray-600"}`}
          >
            {data.logs.length > 0 ? step + 1 : 0}/{data.logs.length}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg ${isDarkMode ? "bg-white/5 text-yellow-400" : "bg-gray-100 text-gray-600"}`}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setCode("")}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <section
          className={`w-[23%] flex flex-col border-r ${isDarkMode ? "bg-[#0a0c10] border-white/5" : "bg-gray-50 border-gray-200"}`}
        >
          <div
            className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border-b ${isDarkMode ? "bg-[#0f1218] border-white/5" : "bg-gray-100 border-gray-200"}`}
          >
            <Code2 size={12} /> Editor
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              theme={isDarkMode ? "vs-dark" : "light"}
              defaultLanguage="javascript"
              value={code}
              onChange={(v) => setCode(v || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                padding: { top: 20 },
                lineNumbers: "on",
              }}
            />
          </div>
        </section>

        <section
          className={`flex-1 flex flex-col relative ${isDarkMode ? "bg-[#07090d]" : "bg-white"}`}
        >
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
          <div
            className={`px-4 py-2 flex justify-between items-center text-[9px] font-black uppercase border-b z-10 ${isDarkMode ? "bg-[#0f1218] border-white/5" : "bg-gray-100 border-gray-200"}`}
          >
            <div className="flex items-center gap-2">
              <Activity size={12} /> Logic Tree
            </div>
            <div className="text-[10px] uppercase">
              {!data.error ? "✓ Valid" : "⚠ Syntax Error"}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-10 z-0">
            {data.ast && (
              <ASTNode
                node={data.ast}
                activeLine={data.logs[step]?.line || -1}
                stepIndex={step}
                executionHistory={currentHistory}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        </section>

        <section
          className={`w-[25%] flex flex-col border-l ${isDarkMode ? "bg-[#0a0c10] border-white/5" : "bg-gray-50 border-gray-200"}`}
        >
          <div className="flex-1 flex flex-col border-b border-inherit overflow-hidden">
            <div
              className={`px-4 py-2 text-[9px] font-black uppercase border-b ${isDarkMode ? "bg-[#0f1218] border-white/5" : "bg-gray-100 border-gray-200"}`}
            >
              <Database size={12} /> Memory
            </div>
            <div className="flex-1 p-4 overflow-auto space-y-2 text-xs">
              {data.logs[step]?.memorySnapshot &&
                Object.entries(data.logs[step].memorySnapshot).map(([k, v]) => (
                  <div
                    key={k}
                    className={`p-3 rounded-xl border ${isDarkMode ? "bg-white/[0.03] border-white/5" : "bg-white border-gray-200 shadow-sm"}`}
                  >
                    <div className="text-[9px] text-blue-500 font-black mb-1">
                      {k}
                    </div>
                    <div className="font-mono">{JSON.stringify(v)}</div>
                  </div>
                ))}
            </div>
          </div>
          <div
            className={`h-[40%] p-4 overflow-auto font-mono text-[11px] ${isDarkMode ? "bg-black/30" : "bg-white border-t"}`}
          >
            {data.error && (
              <div className="text-red-500 mb-4">{data.error.message}</div>
            )}
            {data.logs
              .slice(0, step + 1)
              .filter((l) => l.type === "CONSOLE_LOG")
              .map((log, i) => (
                <div
                  key={i}
                  className={
                    isDarkMode ? "text-emerald-400" : "text-emerald-600"
                  }
                >
                  ❯ {JSON.stringify(log.value)}
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
