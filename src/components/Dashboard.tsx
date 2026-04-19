"use client";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Target, Calendar, LogOut, ChevronLeft, ChevronRight,
  Plus, Star, Flame, CheckCircle2, Circle, Loader2, Trash2, MessageSquare,
} from "lucide-react";
import { loadState, saveState, createDayData, logout, calculateStreaks } from "@/lib/store";
import { AppState, MainTask, SubTask, ManagerNote, Status, User } from "@/lib/types";
import GoalPanel from "./GoalPanel";
import TimelineView from "./TimelineView";

const SCYCLE: Status[] = ["not_started", "doing", "done"];
const SLABEL: Record<Status, string> = { not_started: "Not Started", doing: "Doing", done: "Done" };
const SCOLOR: Record<Status, { bg: string; fg: string }> = {
  not_started: { bg: "#F5F5F4", fg: "#78716C" },
  doing: { bg: "#FFFBEB", fg: "#D97706" },
  done: { bg: "#F0FDF4", fg: "#16A34A" },
};
const CATLABEL: Record<string, string> = { Mandatory: "Mandatory", Company: "Company Tasks", Misc: "Misc" };

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening"; }

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<"tasks" | "goals" | "history">("tasks");
  const [mNote, setMNote] = useState("");

  useEffect(() => { 
    loadState().then(data => setState(data)); 
  }, []);

  const save = useCallback((s: AppState) => {
    s.streaks = calculateStreaks(s.days);
    setState(s);
    saveState(s);
  }, []);

  if (!state) return null;
  const day = state.days[state.currentDate] || createDayData(state.currentDate);
  const isToday = state.currentDate === new Date().toISOString().slice(0, 10);

  const go = (off: number) => {
    const d = new Date(state.currentDate + "T12:00:00");
    d.setDate(d.getDate() + off);
    const nd = d.toISOString().slice(0, 10);
    const ns = { ...state, currentDate: nd };
    if (!ns.days[nd]) ns.days[nd] = createDayData(nd);
    save(ns);
  };
  const setDay = (fn: (d: typeof day) => typeof day) => save({ ...state, days: { ...state.days, [state.currentDate]: fn({ ...day }) } });

  const cycleMain = (id: string) => setDay((d) => ({ ...d, mainTasks: d.mainTasks.map((t) => t.id === id ? { ...t, status: SCYCLE[(SCYCLE.indexOf(t.status) + 1) % 3] } : t) }));
  const setMainName = (id: string, name: string) => setDay((d) => ({ ...d, mainTasks: d.mainTasks.map((t) => t.id === id ? { ...t, name } : t) }));
  const setTime = (id: string, f: "from" | "to", v: string) => setDay((d) => ({ ...d, mainTasks: d.mainTasks.map((t) => t.id === id ? { ...t, [f]: v } : t) }));

  const delSub = (id: string) => setDay((d) => ({ ...d, subTasks: d.subTasks.filter((s) => s.id !== id) }));
  const rate = (r: number) => setDay((d) => ({ ...d, rating: r }));
  const delNote = (id: string) => setDay((d) => ({ ...d, managerNotes: d.managerNotes.filter((n) => n.id !== id) }));

  const doneM = day.mainTasks.filter((t) => t.status === "done").length;
  
  const doneS = day.subTasks.filter(i => i.status === "done").length;
  const totalS = day.subTasks.length;

  const grouped = day.mainTasks.reduce((a, t) => { (a[t.category] ??= []).push(t); return a; }, {} as Record<string, MainTask[]>);

  // ─── Styles ───
  const sidebar: React.CSSProperties = { width: 240, flexShrink: 0, display: "flex", flexDirection: "column", padding: 24, background: "#fff", borderRight: "1px solid #F0EEEC", height: "100vh", position: "sticky", top: 0 };
  const navBtn = (active: boolean): React.CSSProperties => ({ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: active ? "#EFF6FF" : "transparent", color: active ? "#2563EB" : "#78716C", transition: "all 0.15s", textAlign: "left" });
  const card: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #F0EEEC", boxShadow: "0 1px 2px rgba(28,25,23,0.04)" };
  const gridCols = "130px 1fr 220px";
  const inp: React.CSSProperties = { fontSize: 12, padding: "5px 8px", borderRadius: 8, background: "#FAFAF9", border: "1px solid #E7E5E4", color: "#1C1917" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#FAFAF9" }}>
      {/* ─── Sidebar ─── */}
      <aside style={sidebar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#1C1917", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'Fraunces', serif" }}>D</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Command Center</div>
            <div style={{ fontSize: 10, color: "#A8A29E" }}>Devmate Solutions</div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {([["tasks", LayoutDashboard, "Daily Tasks"], ["goals", Target, "Goal Tracker"], ["history", Calendar, "History"]] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id as any)} style={navBtn(tab === id)}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>

        <div style={{ paddingTop: 16, borderTop: "1px solid #F0EEEC" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: user.role === "owner" ? "#2563EB" : "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              {user.name[0]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</div>
              <div style={{ fontSize: 10, color: "#A8A29E", textTransform: "capitalize" }}>{user.role}</div>
            </div>
          </div>
          <button onClick={() => { logout(); onLogout(); }} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#A8A29E", padding: "6px 0" }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "center", minHeight: "100%" }}>
          <div style={{ flex: 1, maxWidth: 880, padding: "28px 32px" }}>

          {/* ═══ TASKS TAB ═══ */}
          {tab === "tasks" && (
            <div>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>
                    {greeting()}, {user.name}
                  </h1>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => go(-1)} style={{ padding: 2 }}><ChevronLeft size={16} color="#A8A29E" /></button>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#78716C" }}>{fmtDate(state.currentDate)}</span>
                    {isToday && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#EFF6FF", color: "#2563EB" }}>Today</span>}
                    <button onClick={() => go(1)} style={{ padding: 2 }}><ChevronRight size={16} color="#A8A29E" /></button>
                  </div>
                </div>
                 <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                     <div style={{ textAlign: "center" }}>
                       <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>{doneM}/{day.mainTasks.length}</div>
                       <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Main Tasks</div>
                     </div>
                     <div style={{ width: 1, height: 32, background: "#E7E5E4" }} />
                     <div style={{ textAlign: "center" }}>
                       <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>{doneS}/{totalS}</div>
                       <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Daily Todos</div>
                     </div>

                   </div>
                   {/* Global Progress Bar */}
                   {(() => {
                      const total = day.mainTasks.length + totalS;
                      const done = doneM + doneS;
                      const pct = total > 0 ? (done / total) * 100 : 0;
                      return (
                        <div style={{ width: 160 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "#78716C", marginBottom: 4 }}>
                            <span>PROGRESS</span>
                            <span>{Math.round(pct)}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "#F1F5F9" }}>
                            <div style={{ height: "100%", borderRadius: 3, background: pct === 100 ? "#16A34A" : "#2563EB", width: `${pct}%`, transition: "width 0.5s ease-out" }} />
                          </div>
                        </div>
                      );
                   })()}
                 </div>
               </div>

              {/* Streaks */}
              {(state.streaks.sleep > 0 || state.streaks.workout > 0) && (
                <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "10px 16px", borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", marginBottom: 18 }}>
                  <Flame size={15} color="#F59E0B" />
                  {state.streaks.sleep > 0 && <span style={{ fontSize: 12 }}><b>Sleep:</b> {state.streaks.sleep} day streak 🔥</span>}
                  {state.streaks.workout > 0 && <span style={{ fontSize: 12 }}><b>Workout:</b> {state.streaks.workout} day streak 🔥</span>}
                </div>
              )}

              {/* Timeline */}
              <TimelineView tasks={day.mainTasks} />

              {/* ─── Daily Task Todos ─── */}
              <DailyTodos
                tasks={day.mainTasks}
                subTasks={day.subTasks as any}
                managerNotes={day.managerNotes as any}
                inp={inp}
                card={card}
                onAddSub={(txt) => {
                  setDay((d) => ({
                    ...d,
                    subTasks: [...d.subTasks, { id: String(Date.now()), parentId: "", text: txt, status: "not_started" as Status }]
                  }));
                }}
                onCycleSub={(id) => setDay((d) => ({ ...d, subTasks: d.subTasks.map((s) => s.id === id ? { ...s, status: SCYCLE[(SCYCLE.indexOf(s.status) + 1) % 3] } : s) }))}
                onDelSub={(id) => delSub(id)}
                onAddNote={(txt) => {
                  setDay((d) => ({
                    ...d,
                    managerNotes: [...d.managerNotes, { id: String(Date.now()), date: state.currentDate, content: txt, status: "not_started" as Status, timestamp: Date.now() }]
                  }));
                }}
                onCycleNote={(id) => setDay((d) => ({ ...d, managerNotes: d.managerNotes.map((n) => n.id === id ? { ...n, status: SCYCLE[(SCYCLE.indexOf(n.status) + 1) % 3] } : n) }))}
                onDelNote={delNote}
                mNote={mNote}
                setMNote={setMNote}
              />

              {/* ─── Task Tables ─── */}
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 20 }}>
                {(["Mandatory", "Company", "Misc"] as const).map((cat) => {
                  const tasks = grouped[cat];
                  if (!tasks) return null;
                  return (
                    <div key={cat}>
                      <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E", marginBottom: 8 }}>
                        {CATLABEL[cat]}
                      </h3>

                      <div style={{ ...card, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 16, padding: "8px 16px", background: "#F9FAFB", borderBottom: "1px solid #F0EEEC" }}>
                          {["Status", "Task", "Time"].map((h) => (
                            <span key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>{h}</span>
                          ))}
                        </div>

                        {tasks.map((task, i) => {
                          const last = i === tasks.length - 1;

                          return (
                            <div key={task.id}>
                              {/* Row */}
                              <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 16, alignItems: "center", padding: "10px 16px", borderBottom: last ? "none" : "1px solid #F0EEEC" }}>
                                {/* Status */}
                                <div>
                                  <button onClick={() => cycleMain(task.id)}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 14, fontSize: 11, fontWeight: 600, background: SCOLOR[task.status].bg, color: SCOLOR[task.status].fg, transition: "all 0.15s" }}>
                                    {task.status === "done" ? <CheckCircle2 size={12} /> : task.status === "doing" ? <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#D97706" }} /> : <Circle size={12} />}
                                    {SLABEL[task.status]}
                                  </button>
                                </div>
                                {/* Name */}
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                                  <input 
                                    value={task.name} 
                                    onChange={(e) => setMainName(task.id, e.target.value)}
                                    style={{ 
                                      fontSize: 13, fontWeight: 500, color: "#1C1917", 
                                      width: "100%", border: "none", background: "none", padding: "2px 4px",
                                      borderRadius: 4, outline: "none"
                                    }}
                                    onFocus={(e) => (e.target.style.background = "#F3F4F6")}
                                    onBlur={(e) => (e.target.style.background = "none")}
                                  />
                                </div>
                                {/* Time */}
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <input type="time" value={task.from} onChange={(e) => setTime(task.id, "from", e.target.value)} style={{ ...inp, minWidth: 90 }} />
                                  <span style={{ fontSize: 10, color: "#A8A29E" }}>–</span>
                                  <input type="time" value={task.to} onChange={(e) => setTime(task.id, "to", e.target.value)} style={{ ...inp, minWidth: 90 }} />
                                </div>
                              </div>


                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>




            </div>
          )}

          {/* ═══ GOALS TAB ═══ */}
          {tab === "goals" && <GoalPanel state={state} onSave={save} />}

          {/* ═══ HISTORY TAB ═══ */}
          {tab === "history" && <HistoryView state={state} onGo={(d) => { save({ ...state, currentDate: d }); setTab("tasks"); }} />}
          </div>

          {/* ═══ RIGHT SIDEBAR (Goals) ═══ */}
          {tab === "tasks" && state.goals && state.goals.length > 0 && (
            <div style={{ width: 320, flexShrink: 0, padding: "28px 32px 28px 0" }}>
              <div style={{ position: "sticky", top: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Goals Overview</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {state.goals.map((goal) => {
                    const pct = Math.min(100, Math.round((goal.current / goal.target) * 100)) || 0;
                    return (
                      <div key={goal.id} style={{ ...card, padding: "16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1917", marginBottom: 8 }}>{goal.title}</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                          <span style={{ fontSize: 20, fontWeight: 700, color: goal.color || "#2563EB", fontFamily: "'Fraunces', serif" }}>
                            {goal.unit === "$" ? `$${goal.current.toLocaleString()}` : goal.current.toLocaleString()}
                          </span>
                          <span style={{ fontSize: 11, color: "#A8A29E" }}>
                            / {goal.unit === "$" ? `$${goal.target.toLocaleString()}` : goal.target.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "#78716C", marginBottom: 4 }}>
                          <span>PROGRESS</span>
                          <span>{pct}%</span>
                        </div>
                        <div style={{ width: "100%", height: 6, borderRadius: 3, background: "#F5F5F4" }}>
                          <div style={{ height: "100%", background: goal.color || "#2563EB", width: `${pct}%`, borderRadius: 3, transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── History ─── */
function HistoryView({ state, onGo }: { state: AppState; onGo: (d: string) => void }) {
  const dates = Object.keys(state.days).sort().reverse();
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>History</h1>
      <p style={{ fontSize: 13, color: "#78716C", marginBottom: 24 }}>Browse past daily snapshots</p>

      {dates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#A8A29E" }}>
          <Calendar size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>No history yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dates.map((date) => {
            const d = state.days[date];
            const done = d.mainTasks.filter((t) => t.status === "done").length;
            const tot = d.mainTasks.length;
            const sd = d.subTasks.filter((s) => s.status === "done").length;
            const st = d.subTasks.length;
            const pct = tot > 0 ? Math.round((done / tot) * 100) : 0;

            return (
              <button key={date} onClick={() => onGo(date)}
                style={{ width: "100%", textAlign: "left", padding: "14px 18px", borderRadius: 12, background: "#fff", border: "1px solid #F0EEEC", transition: "box-shadow 0.15s", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(28,25,23,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{fmtDate(date)}</div>
                    <div style={{ fontSize: 11, color: "#A8A29E", marginTop: 2 }}>{done}/{tot} tasks · {sd}/{st} sub-tasks</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 80, height: 5, borderRadius: 3, background: "#F5F5F4" }}>
                      <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: pct === 100 ? "#16A34A" : "#2563EB", transition: "width 0.5s" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, width: 30, textAlign: "right", color: pct === 100 ? "#16A34A" : "#78716C" }}>{pct}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Daily Todos ─── */

function DailyTodos({
  tasks,
  subTasks,
  managerNotes,
  inp,
  card,
  onAddSub,
  onCycleSub,
  onDelSub,
  onAddNote,
  onCycleNote,
  onDelNote,
  mNote,
  setMNote,
}: {
  tasks: MainTask[];
  subTasks: SubTask[];
  managerNotes: ManagerNote[];
  inp: React.CSSProperties;
  card: React.CSSProperties;
  onAddSub: (v: string) => void;
  onCycleSub: (id: string) => void;
  onDelSub: (id: string) => void;
  onAddNote: (v: string) => void;
  onCycleNote: (id: string) => void;
  onDelNote: (id: string) => void;
  mNote: string;
  setMNote: (v: string) => void;
}) {
  const [todoTab, setTodoTab] = useState<"daily" | "manager">("daily");
  const [globalInput, setGlobalInput] = useState("");
  const [personInput, setPersonInput] = useState("");

  const handleAdd = () => {
    const text = (todoTab === "daily" ? globalInput : mNote).trim();
    if (!text) return;
    if (todoTab === "daily") {
      onAddSub(text);
      setGlobalInput("");
      setPersonInput("");
    } else {
      onAddNote(text);
      setMNote("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const currentList = todoTab === "daily" ? subTasks : managerNotes;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
    color: active ? "#1C1917" : "#A8A29E", 
    borderTop: "none", borderLeft: "none", borderRight: "none",
    borderBottom: active ? "2px solid #2563EB" : "1px solid transparent",
    padding: "0 8px 6px", cursor: "pointer", background: "none"
  });

  return (
    <div style={{ marginTop: 20 }}>
      {/* Tab Switcher */}
      <div style={{ display: "flex", gap: 16, marginBottom: 12, borderBottom: "1px solid #F0EEEC" }}>
        <button onClick={() => setTodoTab("daily")} style={tabStyle(todoTab === "daily")}>Zain's Todos</button>
        <button onClick={() => setTodoTab("manager")} style={tabStyle(todoTab === "manager")}>Fatima's Todos</button>
      </div>

      {/* Quick Add Area */}
      <div style={{ ...card, padding: 12, marginBottom: 12, background: "#fff" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Employee..."
            value={personInput}
            onChange={(e) => setPersonInput(e.target.value)}
            style={{ ...inp, width: 120, fontSize: 13, height: 36, background: "#F5F5F4", flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder={todoTab === "daily" ? "Tasks..." : "Tasks..."}
            value={todoTab === "daily" ? globalInput : mNote}
            onChange={(e) => todoTab === "daily" ? setGlobalInput(e.target.value) : setMNote(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ ...inp, flex: 1, fontSize: 13, height: 36 }}
          />
          <button
            onClick={handleAdd}
            title="Add item"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "#F1F5F9", border: "1px solid #E2E8F0", cursor: "pointer", flexShrink: 0 }}
          >
            <Plus size={18} color="#64748B" />
          </button>
          <button
            onClick={handleAdd}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "0 16px", height: 36, borderRadius: 8,
              fontSize: 12, fontWeight: 700, color: "#fff",
              background: todoTab === "daily" ? "#2563EB" : "#8B5CF6",
              cursor: "pointer", border: "none", flexShrink: 0
            }}
          >
            Add Task
          </button>
        </div>
      </div>

      {currentList.length > 0 && (
        <div style={{ padding: "0 16px" }}>
          {currentList.map((item) => {
            const status = (item as any).status || "not_started";
            const text = (item as any).text || (item as any).content || "Task";

            return (
              <div key={item.id} style={{ ...card, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => todoTab === "daily" ? onCycleSub(item.id) : onCycleNote(item.id)}
                  style={{ flexShrink: 0, display: "flex", border: "none", background: "none", cursor: "pointer" }}
                >
                  {status === "done"
                    ? <CheckCircle2 size={16} color="#16A34A" />
                    : status === "doing"
                    ? <Circle size={16} color="#D97706" fill="#D97706" />
                    : <Circle size={16} color="#D6D3D1" />}
                </button>
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: status === "done" ? "#A8A29E" : "#44403C",
                  textDecoration: status === "done" ? "line-through" : "none",
                  flex: 1
                }}>
                  {text}
                </span>
                <button onClick={() => todoTab === "daily" ? onDelSub(item.id) : onDelNote(item.id)} style={{ padding: 4, opacity: 0.4, transition: "opacity 0.15s", color: "#EF4444" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

