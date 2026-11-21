"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowUp, Loader2, Mic, Check } from "lucide-react";
import { AppState } from "@/lib/types";
import { authHeaders } from "@/lib/store";
import { applyAssistantActions, buildAssistantContext, AssistantAction } from "@/lib/assistant";

interface Turn { id: number; you: string; reply?: string; done?: string[]; error?: string; pending?: boolean }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRec = any;

export default function AssistantBar({
  state,
  onSave,
}: {
  state: AppState;
  onSave: (s: AppState, withStreaks?: boolean, undoLabel?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRec>(null);
  // Always apply to the newest state (the request takes a few seconds).
  const stateRef = useRef(state);
  stateRef.current = state;

  const speechSupported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [turns]);

  const send = async (raw = text) => {
    const message = raw.trim();
    if (!message || busy) return;
    const id = Date.now();
    setTurns((t) => [...t.slice(-9), { id, you: message, pending: true }]);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ message, context: buildAssistantContext(stateRef.current) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      const actions = (data.actions || []) as AssistantAction[];
      const { state: next, done } = applyAssistantActions(stateRef.current, actions);
      if (done.length) onSave(next, false, `Assistant: ${done.length} change${done.length > 1 ? "s" : ""}`);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, pending: false, reply: data.reply, done } : x)));
    } catch (err) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, pending: false, error: (err as Error).message } : x)));
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setText((finalText + interim).trim());
    };
    rec.onend = () => { setListening(false); if (finalText.trim()) send(finalText); };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Assistant (⌘K)"
        style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 900, width: 46, height: 46, borderRadius: 23,
          background: "#1C1917", color: "#fff", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(28,25,23,0.25)",
        }}
      >
        <Sparkles size={18} />
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", right: 20, bottom: 20, zIndex: 900, width: "min(400px, calc(100vw - 32px))",
        background: "#fff", borderRadius: 16, border: "1px solid #E7E5E4", boxShadow: "0 20px 50px rgba(28,25,23,0.18)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #F0EEEC" }}>
        <Sparkles size={14} color="#7C3AED" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1917", flex: 1 }}>Assistant</span>
        <span style={{ fontSize: 10, color: "#A8A29E" }}>⌘K</span>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E", display: "flex" }}><X size={15} /></button>
      </div>

      {turns.length > 0 && (
        <div ref={logRef} style={{ maxHeight: 300, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {turns.map((t) => (
            <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ alignSelf: "flex-end", maxWidth: "85%", background: "#F5F5F4", borderRadius: 10, padding: "6px 10px", fontSize: 12, color: "#1C1917" }}>{t.you}</div>
              {t.pending && <span style={{ fontSize: 12, color: "#A8A29E", display: "flex", alignItems: "center", gap: 6 }}><Loader2 size={12} className="animate-spin" /> Working…</span>}
              {t.error && <span style={{ fontSize: 12, color: "#DC2626" }}>{t.error}</span>}
              {!t.pending && !t.error && (
                <>
                  {t.reply && <span style={{ fontSize: 12, color: "#44403C" }}>{t.reply}</span>}
                  {(t.done || []).map((d, i) => (
                    <span key={i} style={{ fontSize: 11, color: "#15803D", display: "flex", alignItems: "flex-start", gap: 5 }}>
                      <Check size={12} style={{ flexShrink: 0, marginTop: 1 }} /> {d}
                    </span>
                  ))}
                  {t.done && t.done.length === 0 && !t.reply && <span style={{ fontSize: 12, color: "#A8A29E" }}>Nothing to change.</span>}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, padding: 10, borderTop: turns.length ? "1px solid #F0EEEC" : "none" }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
          placeholder={listening ? "Listening…" : "Tell me what to add"}
          style={{ flex: 1, resize: "none", border: "none", outline: "none", fontSize: 13, padding: "8px 6px", background: "transparent", color: "#1C1917", maxHeight: 120, fontFamily: "inherit" }}
        />
        {speechSupported && (
          <button
            onClick={toggleMic}
            title={listening ? "Stop" : "Speak"}
            style={{ width: 32, height: 32, borderRadius: 16, border: "1px solid #E7E5E4", background: listening ? "#FEE2E2" : "#fff", color: listening ? "#DC2626" : "#78716C", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <Mic size={14} />
          </button>
        )}
        <button
          onClick={() => send()}
          disabled={busy || !text.trim()}
          style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: busy || !text.trim() ? "#D6D3D1" : "#1C1917", color: "#fff", cursor: busy ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
        </button>
      </div>
    </div>
  );
}
