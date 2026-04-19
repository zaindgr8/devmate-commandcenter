"use client";
import { useState } from "react";
import { Plus, Trash2, Target, TrendingUp, Edit3, Check, X } from "lucide-react";
import { AppState, Goal } from "@/lib/types";

const COLORS = ["#E1306C", "#2563EB", "#16A34A", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#EF4444"];

function Ring({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  // Clamp: if there's any progress, show at least a small arc (1%) so it's visible
  const visiblePct = pct > 0 ? Math.max(1, pct) : 0;
  const r = (size - 8) / 2, c = 2 * Math.PI * r, off = c - (visiblePct / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0EEEC" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
    </svg>
  );
}

export default function GoalPanel({ state, onSave }: { state: AppState; onSave: (s: AppState) => void }) {
  const [adding, setAdding] = useState(false);
  const [editState, setEditState] = useState<{ id: string, field: "current" | "target" | "title" } | null>(null);
  const [form, setForm] = useState({ title: "", target: "", current: "", unit: "", color: COLORS[0] });

  const add = () => {
    if (!form.title || !form.target) return;
    const g: Goal = { id: "g_" + Date.now(), title: form.title, target: +form.target, current: +(form.current || 0), unit: form.unit || "units", color: form.color };
    onSave({ ...state, goals: [...state.goals, g] });
    setForm({ title: "", target: "", current: "", unit: "", color: COLORS[0] });
    setAdding(false);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    onSave({ ...state, goals: state.goals.map((g) => g.id === id ? { ...g, ...updates } : g) });
    setEditState(null);
  };

  const del = (id: string) => onSave({ ...state, goals: state.goals.filter((g) => g.id !== id) });

  const linkedCount = (gid: string) => {
    let c = 0;
    Object.values(state.days).forEach((d) => d.mainTasks.forEach((t) => { if (t.goalLink === gid && t.status === "done") c++; }));
    return c;
  };

  const card: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #F0EEEC", padding: 20, boxShadow: "0 1px 2px rgba(28,25,23,0.04)" };
  const inp: React.CSSProperties = { width: "100%", fontSize: 13, padding: "8px 12px", borderRadius: 10, background: "#FAFAF9", border: "1px solid #E7E5E4", color: "#1C1917" };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>Goal Tracker</h1>
          <p style={{ fontSize: 13, color: "#78716C" }}>Visualize progress on what matters most</p>
        </div>
        <button onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#fff", background: "#2563EB" }}>
          <Plus size={15} /> New Goal
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Create New Goal</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#A8A29E", display: "block", marginBottom: 4 }}>Title</label>
              <input style={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Instagram Followers" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#A8A29E", display: "block", marginBottom: 4 }}>Target</label>
              <input style={inp} type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="5000" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#A8A29E", display: "block", marginBottom: 4 }}>Current</label>
              <input style={inp} type="number" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#A8A29E", display: "block", marginBottom: 4 }}>Unit Price</label>
              <input style={inp} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="i.e 50$ etc" />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, color: "#A8A29E", display: "block", marginBottom: 6 }}>Color</label>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  style={{ width: 28, height: 28, borderRadius: 14, background: c, border: form.color === c ? `3px solid ${c}` : "3px solid transparent", outline: form.color === c ? "2px solid #fff" : "none", outlineOffset: -3, transition: "all 0.15s" }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", fontSize: 13, color: "#78716C", borderRadius: 10 }}>Cancel</button>
            <button onClick={add} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "#fff", background: "#2563EB", borderRadius: 10 }}>Create</button>
          </div>
        </div>
      )}

      {/* Goal Cards Grid */}
      {state.goals.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {state.goals.map((g) => {
            const rawPct = (g.current / g.target) * 100;
            const pct = Math.min(100, rawPct);
            const displayPct = Math.round(pct);
            const lc = linkedCount(g.id);
            return (
              <div key={g.id} style={{ ...card, position: "relative" }}>
                {/* Delete */}
                <button onClick={() => del(g.id)} style={{ position: "absolute", top: 12, right: 12, padding: 4, borderRadius: 6, opacity: 0.4, transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}>
                  <Trash2 size={13} color="#EF4444" />
                </button>

                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  {/* Ring */}
                  <div style={{ position: "relative", flexShrink: 0, width: 80, height: 80 }}>
                    <Ring pct={pct} color={g.color} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>{displayPct}%</span>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 4 }}>
                      {editState?.id === g.id && editState.field === "title" ? (
                        <EditString value={g.title} onSave={(v) => updateGoal(g.id, { title: v })} onCancel={() => setEditState(null)} />
                      ) : (
                        <button onClick={() => setEditState({ id: g.id, field: "title" })} style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", transition: "opacity 0.15s" }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</span>
                          <Edit3 size={11} color="#A8A29E" />
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      {editState?.id === g.id && editState.field === "current" ? (
                        <EditNum value={g.current} onSave={(v) => updateGoal(g.id, { current: v })} onCancel={() => setEditState(null)} />
                      ) : (
                        <button onClick={() => setEditState({ id: g.id, field: "current" })} style={{ display: "flex", alignItems: "center", gap: 4, transition: "opacity 0.15s", cursor: "pointer" }}>
                          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif", color: g.color }}>
                            {g.unit === "$" ? "$" : ""}{g.current.toLocaleString()}
                          </span>
                          <Edit3 size={11} color="#A8A29E" />
                        </button>
                      )}
                      
                      <span style={{ fontSize: 12, color: "#A8A29E", display: "inline-flex", alignItems: "baseline", gap: 3 }}>
                        / 
                        {editState?.id === g.id && editState.field === "target" ? (
                          <EditNum value={g.target} onSave={(v) => updateGoal(g.id, { target: v })} onCancel={() => setEditState(null)} />
                        ) : (
                          <button onClick={() => setEditState({ id: g.id, field: "target" })} style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "inherit", cursor: "pointer" }}>
                            {g.unit === "$" ? "$" : ""}{g.target.toLocaleString()} <Edit3 size={11} />
                          </button>
                        )}
                      </span>
                    </div>
                    {lc > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                        <TrendingUp size={11} color="#16A34A" />
                        <span style={{ fontSize: 11, color: "#A8A29E" }}>{lc} completed tasks linked</span>
                      </div>
                    )}
                    {/* Progress bar */}
                    <div style={{ marginTop: 10, height: 5, borderRadius: 3, background: "#F5F5F4" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: g.color, width: `${pct}%`, minWidth: pct > 0 ? 4 : 0, transition: "width 1s ease-out" }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !adding ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#A8A29E" }}>
          <Target size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>No goals yet. Set your first target!</p>
        </div>
      ) : null}
    </div>
  );
}

function EditString({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(value);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <input type="text" value={v} onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(v); if (e.key === "Escape") onCancel(); }}
        style={{ fontSize: 13, fontWeight: 600, padding: "2px 6px", borderRadius: 6, border: "1px solid #2563EB", background: "#FAFAF9", outline: "none", width: 140 }}
        autoFocus />
      <button onClick={() => onSave(v)} style={{ padding: 2 }}><Check size={12} color="#16A34A" /></button>
      <button onClick={onCancel} style={{ padding: 2 }}><X size={12} color="#EF4444" /></button>
    </div>
  );
}

function EditNum({ value, onSave, onCancel }: { value: number; onSave: (v: number) => void; onCancel: () => void }) {
  const [v, setV] = useState(String(value));
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <input type="number" value={v} onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(+v); if (e.key === "Escape") onCancel(); }}
        style={{ width: 80, fontSize: 14, fontWeight: 700, padding: "2px 6px", borderRadius: 6, border: "1px solid #2563EB", background: "#FAFAF9", fontFamily: "'Fraunces', serif", outline: "none" }}
        autoFocus />
      <button onClick={() => onSave(+v)} style={{ padding: 2 }}><Check size={12} color="#16A34A" /></button>
      <button onClick={onCancel} style={{ padding: 2 }}><X size={12} color="#EF4444" /></button>
    </div>
  );
}
