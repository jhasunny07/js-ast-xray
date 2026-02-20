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
  Activity,
  Layers,
  Terminal,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sun,
  Moon,
} from "lucide-react";
import { processCode } from "@/lib/engine";

// --- AST INSPECTOR ---
const ASTNode = ({ node, name, activeLine, isDarkMode }: any) => {
  const [isExpanded, setIsExpanded] = useState(
    name === "program" || name === "body",
  );
  const keyCol = isDarkMode ? "text-blue-400" : "text-[#881391]";
  const stringCol = isDarkMode ? "text-emerald-400" : "text-[#c41a16]";
  const numberCol = isDarkMode ? "text-orange-400" : "text-[#1c00cf]";

  if (node === null || typeof node !== "object") {
    return (
      <div
        className={`flex items-center gap-2 ml-4 py-0.5 border-l ${isDarkMode ? "border-white/10" : "border-gray-200"} pl-4`}
      >
        <span className={`text-[10px] font-mono font-bold ${keyCol}`}>
          {name}:
        </span>
        <span
          className={`text-[10px] font-mono ${typeof node === "string" ? stringCol : numberCol}`}
        >
          {node === null ? "null" : JSON.stringify(node)}
        </span>
      </div>
    );
  }

  if (Array.isArray(node)) {
    return (
      <div
        className={`ml-4 border-l ${isDarkMode ? "border-white/10" : "border-gray-200"}`}
      >
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer ${isDarkMode ? "hover:bg-white/5" : "hover:bg-gray-100"}`}
        >
          <span className="text-[9px]">{isExpanded ? "▼" : "▶"}</span>
          <span
            className={`text-[10px] font-mono ${isDarkMode ? "text-gray-400" : "text-gray-700"}`}
          >
            {name}{" "}
            <span className="text-[8px] opacity-50">[{node.length}]</span>
          </span>
        </div>
        {isExpanded && (
          <div>
            {node.map((item, idx) => (
              <ASTNode
                key={idx}
                node={item}
                name={idx.toString()}
                activeLine={activeLine}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const startLine = node?.loc?.start?.line;
  const isActive = startLine === activeLine;

  return (
    <div
      className={`ml-4 border-l ${isDarkMode ? "border-white/10" : "border-gray-200"}`}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer transition-all ${isActive ? "bg-yellow-500 text-black font-bold" : isDarkMode ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-100 text-gray-800"}`}
      >
        <span className="text-[9px]">{isExpanded ? "▼" : "▶"}</span>
        <span className="text-[10px] font-mono font-bold">
          {name}{" "}
          {node.type && (
            <span className="text-[9px] font-normal opacity-50">
              ({node.type})
            </span>
          )}
        </span>
      </div>
      {isExpanded && (
        <div>
          {Object.entries(node).map(([k, v]) => (
            <ASTNode
              key={k}
              node={v}
              name={k}
              activeLine={activeLine}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- CALL STACK ---
const CallStack = ({ logs, step, isDarkMode }: any) => {
  const stack: { name: string; args: any }[] = [{ name: "Global", args: null }];
  for (let i = 0; i <= step; i++) {
    const log = logs[i];
    if (log?.type === "ENTER_FUNCTION")
      stack.push({ name: log.name, args: log.value });
    if (log?.type === "EXIT_FUNCTION") stack.pop();
  }

  return (
    <div className="flex flex-col-reverse gap-2">
      {stack.map((frame, i) => (
        <div
          key={i}
          className={`p-3 border-l-4 ${i === stack.length - 1 ? "border-yellow-500 bg-yellow-500/10" : "border-gray-600 bg-black/20 opacity-50"}`}
        >
          <div
            className={`text-[10px] font-mono font-bold uppercase ${isDarkMode ? "text-white" : "text-black"}`}
          >
            {frame.name}
          </div>
          {frame.args && (
            <div className="text-[9px] mt-1 text-blue-400">
              {JSON.stringify(frame.args)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default function XRayApp() {
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [editorWidth, setEditorWidth] = useState(350);
  const [astWidth, setAstWidth] = useState(400);
  const [stackHeight, setStackHeight] = useState(180);
  const [memoryHeight, setMemoryHeight] = useState(250);

  const [code, setCode] = useState(
    'console.log("Starting...");\nfunction greet(name) {\n  console.log("Hello", name);\n}\ngreet("Dev");\nconsole.log("Done!");',
  );
  const [data, setData] = useState<{ ast: any; logs: any[]; error: any }>({
    ast: null,
    logs: [],
    error: null,
  });
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step, data.logs]);

  const startResizing =
    (setter: any, currentSize: number, direction: "h" | "v") =>
    (e: React.MouseEvent) => {
      const startPos = direction === "h" ? e.clientX : e.clientY;
      const onMove = (mE: MouseEvent) => {
        const delta =
          direction === "h" ? mE.clientX - startPos : mE.clientY - startPos;
        setter(Math.max(50, currentSize + delta));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const result = processCode(code);
    if (result.success) {
      try {
        const runtimeLogs = new Function(result.instrumented!)() || [];
        setData({ ast: result.ast, logs: runtimeLogs, error: null });
        setStep(0);
      } catch (e: any) {
        setData((p) => ({ ...p, error: { message: e.message } }));
      }
    }
  }, [code, mounted]);

  useEffect(() => {
    if (isPlaying && step < data.logs.length - 1) {
      const t = setTimeout(() => setStep((s) => s + 1), 600);
      return () => clearTimeout(t);
    } else setIsPlaying(false);
  }, [isPlaying, step, data.logs.length]);

  if (!mounted) return null;

  const borderCol = isDarkMode ? "border-[#222222]" : "border-[#d1d1d1]";
  const headerBg = isDarkMode ? "bg-[#111111]" : "bg-[#f1f3f5]";

  return (
    <div
      className={`h-screen w-screen flex flex-col ${isDarkMode ? "bg-black text-white" : "bg-white text-black"} font-sans overflow-hidden select-none`}
    >
      {/* HEADER */}
      <nav
        className={`h-14 flex items-center justify-between px-6 border-b ${borderCol} ${headerBg}`}
      >
        <div className="flex items-center gap-3">
          <Zap size={18} className="text-yellow-500" />
          <span className="font-bold text-xs tracking-widest uppercase">
            JS-XRAY PRO
          </span>
        </div>
        <div
          className={`flex items-center gap-6 ${isDarkMode ? "bg-zinc-900" : "bg-gray-100"} px-6 py-1 rounded-full border ${borderCol}`}
        >
          <button onClick={() => setStep(0)}>
            <RotateCcw size={14} />
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))}>
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-8 h-8 flex items-center justify-center rounded bg-yellow-500 text-black`}
            >
              {isPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} className="ml-1" />
              )}
            </button>
            <button
              onClick={() =>
                setStep((s) => Math.min(data.logs.length - 1, s + 1))
              }
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="text-[10px] font-mono font-bold text-yellow-500">
            {step + 1} / {data.logs.length}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded border ${borderCol}`}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setCode("")}
            className="p-2 text-red-500 border border-red-500/20 rounded"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <section
          style={{ width: `${editorWidth}px` }}
          className={`flex flex-col border-r ${borderCol} relative`}
        >
          <div
            className={`px-4 py-2 text-[10px] font-bold ${headerBg} border-b ${borderCol}`}
          >
            EDITOR
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              theme={isDarkMode ? "vs-dark" : "light"}
              defaultLanguage="javascript"
              value={code}
              onChange={(v) => setCode(v || "")}
              options={{ minimap: { enabled: false } }}
            />
          </div>
          <div
            onMouseDown={startResizing(setEditorWidth, editorWidth, "h")}
            className="absolute -right-1 w-2 h-full cursor-col-resize z-50 hover:bg-yellow-500"
          />
        </section>

        <section
          style={{ width: `${astWidth}px` }}
          className={`flex flex-col border-r ${borderCol} relative`}
        >
          <div
            className={`px-4 py-2 text-[10px] font-bold ${headerBg} border-b ${borderCol}`}
          >
            ENGINE_AST
          </div>
          <div className="flex-1 overflow-auto p-4 font-mono custom-scrollbar">
            {data.ast && (
              <ASTNode
                node={data.ast}
                name="Program"
                activeLine={data.logs[step]?.line}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
          <div
            onMouseDown={startResizing(setAstWidth, astWidth, "h")}
            className="absolute -right-1 w-2 h-full cursor-col-resize z-50 hover:bg-yellow-500"
          />
        </section>

        <section
          className={`flex-1 flex flex-col ${isDarkMode ? "bg-zinc-950" : "bg-gray-50"}`}
        >
          <div
            style={{ height: `${stackHeight}px` }}
            className={`flex flex-col border-b ${borderCol} relative`}
          >
            <div
              className={`px-4 py-2 ${headerBg} font-bold text-[10px] border-b ${borderCol}`}
            >
              CALL_STACK
            </div>
            <div className="flex-1 overflow-auto p-4">
              <CallStack logs={data.logs} step={step} isDarkMode={isDarkMode} />
            </div>
            <div
              onMouseDown={startResizing(setStackHeight, stackHeight, "v")}
              className="absolute bottom-0 w-full h-1 cursor-row-resize hover:bg-yellow-500"
            />
          </div>

          <div
            style={{ height: `${memoryHeight}px` }}
            className={`flex flex-col border-b ${borderCol} relative`}
          >
            <div
              className={`px-4 py-2 ${headerBg} font-bold text-[10px] border-b ${borderCol}`}
            >
              MEMORY
            </div>
            <div className="flex-1 overflow-auto p-4">
              {data.logs[step]?.memorySnapshot &&
                Object.entries(data.logs[step].memorySnapshot).map(([k, v]) => (
                  <div
                    key={k}
                    className={`p-1 flex justify-between font-mono text-[11px]`}
                  >
                    <span className="text-blue-500 font-bold">{k}:</span>
                    <span>{JSON.stringify(v)}</span>
                  </div>
                ))}
            </div>
            <div
              onMouseDown={startResizing(setMemoryHeight, memoryHeight, "v")}
              className="absolute bottom-0 w-full h-1 cursor-row-resize hover:bg-yellow-500"
            />
          </div>

          {/* FIXED CONSOLE SECTION */}
          <div className="flex-1 flex flex-col bg-black text-emerald-500 overflow-hidden">
            <div
              className={`px-4 py-2 bg-zinc-900 font-bold text-[10px] border-b border-white/5`}
            >
              TERMINAL_OUTPUT
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-[12px]">
              {data.logs
                .slice(0, step + 1)
                .filter((l) => l.type === "CONSOLE_LOG")
                .map((l, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-zinc-600 mr-2">[{i}]</span>
                    <span className="text-white opacity-40 mr-2">❯</span>
                    {Array.isArray(l.value)
                      ? l.value.join(" ")
                      : String(l.value)}
                  </div>
                ))}
              <div
                ref={consoleEndRef}
                className="h-4 w-2 bg-emerald-500/50 animate-pulse inline-block"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
