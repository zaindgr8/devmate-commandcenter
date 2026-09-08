"use client";
// AlertTicker: persisted in localStorage for simplicity (not in AppState)
import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, Target, Calendar, LogOut, ChevronLeft, ChevronRight,
  Plus, Star, Flame, CheckCircle2, Circle, Loader2, Trash2, MessageSquare, Moon, Smartphone, Archive, Download, ExternalLink, Image as ImageIcon, Banknote, Folders, Users, Clock, ChevronDown, X
} from "lucide-react";
import { loadState, saveState, createDayData, logout, calculateStreaks } from "@/lib/store";
import { AppState, MainTask, SubTask, ManagerNote, Status, User, Project, Employee, Meeting } from "@/lib/types";
import GoalPanel from "./GoalPanel";
import TimelineView from "./TimelineView";
import AppTrackerPanel from "./AppTrackerPanel";
import ContentCreationPanel from "./ContentCreationPanel";
import ProjectsPanel from "./ProjectsPanel";
import EmployeesPanel from "./EmployeesPanel";

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

/* ─── Alert Ticker ─── */
function AlertTicker() {
  const STORAGE_KEY = "devmate_alerts";
  const [alerts, setAlerts] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["Stay focused. Ship daily. 🚀"];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : ["Stay focused. Ship daily. 🚀"];
    } catch { return ["Stay focused. Ship daily. 🚀"]; }
  });
  const [showInput, setShowInput] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    }
  }, [alerts]);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  const addAlert = () => {
    const t = draft.trim();
    if (!t) { setShowInput(false); return; }
    setAlerts(prev => [...prev, t]);
    setDraft("");
    setShowInput(false);
  };

  const removeAlert = (idx: number) =>
    setAlerts(prev => prev.filter((_, i) => i !== idx));

  // Build the scrolling text: repeat alerts so it loops
  const tickerText = alerts.length > 0
    ? [...alerts, ...alerts].map((a, i) => (
      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, paddingRight: 60 }}>
        <span style={{ opacity: 0.6, fontSize: 10 }}>●</span>
        {a}
        <button
          onClick={(e) => { e.stopPropagation(); removeAlert(i % alerts.length); }}
          title="Remove alert"
          style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
            width: 14, height: 14, display: "inline-flex", alignItems: "center",
            justifyContent: "center", color: "#fff", cursor: "pointer",
            fontSize: 10, lineHeight: 1, flexShrink: 0,
          }}
        >×</button>
      </span>
    ))
    : [<span key="empty" style={{ paddingRight: 60, opacity: 0.7 }}>No alerts — click [+] to add one</span>];

  const duration = Math.max(12, alerts.length * 8);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      height: 36, background: "linear-gradient(90deg, #DC2626 0%, #B91C1C 50%, #991B1B 100%)",
      display: "flex", alignItems: "center", overflow: "hidden",
      boxShadow: "0 2px 12px rgba(220,38,38,0.4)",
    }}>
      {/* Scrolling text */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
        <style>{`
          @keyframes ticker-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker-inner {
            display: inline-flex;
            white-space: nowrap;
            animation: ticker-scroll ${duration}s linear infinite;
            will-change: transform;
          }
          .ticker-inner:hover { animation-play-state: paused; }
        `}</style>
        <div className="ticker-inner" style={{
          fontSize: 12, fontWeight: 600, color: "#fff",
          letterSpacing: 0.3, fontFamily: "'Inter', sans-serif",
        }}>
          {tickerText}
        </div>
      </div>

      {/* [+] button */}
      {showInput ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 12, flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addAlert(); if (e.key === "Escape") { setShowInput(false); setDraft(""); } }}
            placeholder="New alert…"
            style={{
              fontSize: 12, padding: "3px 10px", borderRadius: 6,
              border: "1.5px solid rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.15)", color: "#fff",
              outline: "none", width: 200,
            }}
          />
          <button
            onClick={addAlert}
            style={{
              fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 6,
              background: "#fff", color: "#DC2626", border: "none", cursor: "pointer",
            }}
          >Add</button>
          <button
            onClick={() => { setShowInput(false); setDraft(""); }}
            style={{
              fontSize: 14, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
              background: "transparent", color: "rgba(255,255,255,0.7)", border: "none", cursor: "pointer",
            }}
          >✕</button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          title="Add new alert"
          style={{
            marginRight: 12, flexShrink: 0,
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 700,
            background: "rgba(255,255,255,0.2)", color: "#fff",
            border: "1.5px solid rgba(255,255,255,0.4)",
            borderRadius: 6, padding: "3px 10px", cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
        >
          [+]
        </button>
      )}
    </div>
  );
}

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<"tasks" | "goals" | "apptracker" | "content" | "history" | "projects" | "employees">("tasks");
  const [mNote, setMNote] = useState("");
  const [draggedGoal, setDraggedGoal] = useState<string | null>(null);

  const [activeSlide, setActiveSlide] = useState<"timeline" | "tables">("timeline");
  const [viewportHeight, setViewportHeight] = useState<number | string>("auto");
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const tablesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = activeSlide === "timeline" ? timelineRef.current : tablesRef.current;
    if (element) {
      setViewportHeight(element.scrollHeight);
    }
  }, [activeSlide, state?.currentDate, state?.days]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (scrollLeft > clientWidth / 2) {
      setActiveSlide("tables");
    } else {
      setActiveSlide("timeline");
    }
  };

  const scrollToSlide = (slide: "timeline" | "tables") => {
    if (!scrollRef.current) return;
    const target = slide === "timeline" ? 0 : scrollRef.current.clientWidth + 20;
    scrollRef.current.scrollTo({ left: target, behavior: "smooth" });
    setActiveSlide(slide);
  };

  useEffect(() => {
    loadState().then(data => setState(data));
  }, []);

  // saveState is now synchronous (debounces the network call internally)
  // calculateStreaks is expensive — only compute it when explicitly needed,
  // not on every keystroke. Pass `withStreaks=true` only on day/status changes.
  const save = useCallback((s: AppState, withStreaks = false) => {
    if (withStreaks) s.streaks = calculateStreaks(s.days);
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
    save(ns); // no streak recalc needed on navigation
  };

  const doneForToday = () => {
    const todayKey = state.currentDate;
    const td = state.days[todayKey];
    if (!td) return;

    // Compute next day key
    const nextDate = new Date(todayKey + "T12:00:00");
    nextDate.setDate(nextDate.getDate() + 1);
    const nextKey = nextDate.toISOString().slice(0, 10);

    const prefix = "carried_" + Date.now() + "_";

    // 1. Group today's subTasks by section header (or null for top-level tasks)
    interface SectionBlock {
      section: SubTask | null;
      tasks: SubTask[];
    }

    const blocks: SectionBlock[] = [];
    let currentBlock: SectionBlock = { section: null, tasks: [] };

    for (const item of td.subTasks) {
      if (item.isSection) {
        if (currentBlock.section !== null || currentBlock.tasks.length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = { section: item, tasks: [] };
      } else {
        currentBlock.tasks.push(item);
      }
    }
    if (currentBlock.section !== null || currentBlock.tasks.length > 0) {
      blocks.push(currentBlock);
    }

    // 2. Process each block: split tasks into carried vs remaining for today
    const carriedBlocks: { section: SubTask | null; tasks: SubTask[] }[] = [];
    const newTodaySubTasks: SubTask[] = [];

    for (const block of blocks) {
      const carriedTasksInBlock: SubTask[] = [];
      const remainingTasksInBlock: SubTask[] = [];

      for (const t of block.tasks) {
        if (t.chips && t.chips.length > 0) {
          const doingChips = t.chips.filter((c) => c.status === "doing");
          const nonDoingChips = t.chips.filter((c) => c.status !== "doing");

          if (doingChips.length > 0) {
            const resetChips = doingChips.map((c) => ({ ...c, status: "not_started" as Status }));
            const newText = resetChips.map((c) => c.text).join(", ");
            carriedTasksInBlock.push({
              ...t,
              id: prefix + t.id,
              status: "not_started" as Status,
              chips: resetChips,
              text: newText,
            });
          }

          if (nonDoingChips.length > 0) {
            const allDone = nonDoingChips.every((c) => c.status === "done");
            const anyDoing = nonDoingChips.some((c) => c.status === "doing" || c.status === "done");
            const status: Status = allDone ? "done" : anyDoing ? "doing" : "not_started";
            const text = nonDoingChips.map((c) => c.text).join(", ");
            remainingTasksInBlock.push({
              ...t,
              chips: nonDoingChips,
              status,
              text,
            });
          }
        } else {
          // Plain task without chips
          if (t.status === "doing") {
            carriedTasksInBlock.push({
              ...t,
              id: prefix + t.id,
              status: "not_started" as Status,
            });
          } else {
            remainingTasksInBlock.push(t);
          }
        }
      }

      // Today's list: keep section if it has remaining tasks
      if (remainingTasksInBlock.length > 0) {
        if (block.section) newTodaySubTasks.push(block.section);
        newTodaySubTasks.push(...remainingTasksInBlock);
      }

      // Tomorrow's list: include section tag with its carried subtasks
      // If the section exists, it goes to tomorrow; any carried subtasks go under it
      if (block.section || carriedTasksInBlock.length > 0) {
        carriedBlocks.push({
          section: block.section,
          tasks: carriedTasksInBlock,
        });
      }
    }

    // 3. Process managerNotes
    const carriedNotes: ManagerNote[] = [];
    const newTodayNotes: ManagerNote[] = [];

    for (const note of td.managerNotes) {
      if (note.chips && note.chips.length > 0) {
        const doingChips = note.chips.filter((c) => c.status === "doing");
        const nonDoingChips = note.chips.filter((c) => c.status !== "doing");

        if (doingChips.length > 0) {
          const resetChips = doingChips.map((c) => ({ ...c, status: "not_started" as Status }));
          const newText = resetChips.map((c) => c.text).join(", ");
          carriedNotes.push({
            ...note,
            id: prefix + note.id,
            date: nextKey,
            status: "not_started" as Status,
            chips: resetChips,
            content: newText,
          });
        }

        if (nonDoingChips.length > 0) {
          const allDone = nonDoingChips.every((c) => c.status === "done");
          const anyDoing = nonDoingChips.some((c) => c.status === "doing" || c.status === "done");
          const status: Status = allDone ? "done" : anyDoing ? "doing" : "not_started";
          const newText = nonDoingChips.map((c) => c.text).join(", ");
          newTodayNotes.push({
            ...note,
            chips: nonDoingChips,
            status,
            content: newText,
          });
        }
      } else {
        if (note.status === "doing") {
          carriedNotes.push({
            ...note,
            id: prefix + note.id,
            date: nextKey,
            status: "not_started" as Status,
          });
        } else {
          newTodayNotes.push(note);
        }
      }
    }

    // 4. Process meetings
    const carryMeetings = (td.meetings || []).filter((m) => m.status === "not_started" || m.status === "doing");
    const remainingMeetings = (td.meetings || []).filter((m) => m.status === "done");

    const carriedMeetings = carryMeetings.map((m) => ({
      ...m,
      id: prefix + m.id,
      status: "not_started" as Status,
    }));

    // Check if there is anything to carry forward
    const totalCarriedTasks = carriedBlocks.reduce((acc, b) => acc + b.tasks.length, 0);
    if (totalCarriedTasks === 0 && carriedNotes.length === 0 && carriedMeetings.length === 0) {
      alert("No tasks in 'Doing' status or meetings in 'Not Started'/'Doing' status to carry forward.");
      return;
    }

    // 5. Merge into next day's subTasks preserving sections and grouping
    const existingNext = state.days[nextKey] || createDayData(nextKey);
    const existingNextSubs = existingNext.subTasks || [];

    let newNextSubTasks: SubTask[] = [];

    if (existingNextSubs.length === 0) {
      for (const cb of carriedBlocks) {
        if (cb.section) {
          newNextSubTasks.push({
            ...cb.section,
            id: prefix + cb.section.id,
            status: "not_started" as Status,
          });
        }
        newNextSubTasks.push(...cb.tasks);
      }
    } else {
      // Group existing items in next day
      const nextBlocks: { section: SubTask | null; tasks: SubTask[] }[] = [];
      let cur: { section: SubTask | null; tasks: SubTask[] } = { section: null, tasks: [] };
      for (const item of existingNextSubs) {
        if (item.isSection) {
          if (cur.section !== null || cur.tasks.length > 0) {
            nextBlocks.push(cur);
          }
          cur = { section: item, tasks: [] };
        } else {
          cur.tasks.push(item);
        }
      }
      if (cur.section !== null || cur.tasks.length > 0) {
        nextBlocks.push(cur);
      }

      // Merge carriedBlocks into nextBlocks
      for (const cb of carriedBlocks) {
        if (!cb.section) {
          if (cb.tasks.length > 0) {
            let topBlock = nextBlocks.find((b) => b.section === null);
            if (!topBlock) {
              topBlock = { section: null, tasks: [] };
              nextBlocks.unshift(topBlock);
            }
            topBlock.tasks = [...cb.tasks, ...topBlock.tasks];
          }
          continue;
        }

        const secName = cb.section.text.trim().toLowerCase();
        const existingBlock = nextBlocks.find(
          (b) => b.section && b.section.text.trim().toLowerCase() === secName
        );

        if (existingBlock) {
          existingBlock.tasks = [...cb.tasks, ...existingBlock.tasks];
        } else {
          nextBlocks.push({
            section: {
              ...cb.section,
              id: prefix + cb.section.id,
              status: "not_started" as Status,
            },
            tasks: cb.tasks,
          });
        }
      }

      for (const b of nextBlocks) {
        if (b.section) newNextSubTasks.push(b.section);
        newNextSubTasks.push(...b.tasks);
      }
    }

    const updatedToday = {
      ...td,
      subTasks: newTodaySubTasks,
      managerNotes: newTodayNotes,
      meetings: remainingMeetings,
    };
    const updatedNext = {
      ...existingNext,
      subTasks: newNextSubTasks,
      managerNotes: [...carriedNotes, ...(existingNext.managerNotes || [])],
      meetings: [...carriedMeetings, ...(existingNext.meetings || [])],
    };

    save({
      ...state,
      days: { ...state.days, [todayKey]: updatedToday, [nextKey]: updatedNext },
      currentDate: nextKey,
    });
  };
  // setDay: used for text edits, chip adds, etc. — no streak recalc
  const setDay = (fn: (d: typeof day) => typeof day) => save({ ...state, days: { ...state.days, [state.currentDate]: fn({ ...day }) } });

  const addMeeting = (m: Omit<Meeting, "id">) => {
    setDay((d) => ({
      ...d,
      meetings: [...(d.meetings || []), { ...m, id: "meet_" + Date.now() }],
    }));
  };

  const deleteMeeting = (id: string) => {
    if (!window.confirm("Delete this meeting?")) return;
    setDay((d) => ({
      ...d,
      meetings: (d.meetings || []).filter((meet) => meet.id !== id),
    }));
  };

  const cycleMeetingStatus = (id: string) => {
    setDay((d) => ({
      ...d,
      meetings: (d.meetings || []).map((meet) => {
        if (meet.id === id) {
          const idx = SCYCLE.indexOf(meet.status);
          const next = SCYCLE[(idx + 1) % 3];
          return { ...meet, status: next };
        }
        return meet;
      }),
    }));
  };

  // cycleMain changes status (sleep/workout streak tracking) — recalc streaks here
  const cycleMain = (id: string) => {
    const updated = { ...state, days: { ...state.days, [state.currentDate]: { ...day, mainTasks: day.mainTasks.map((t) => t.id === id ? { ...t, status: SCYCLE[(SCYCLE.indexOf(t.status) + 1) % 3] } : t) } } };
    save(updated, true); // withStreaks=true only on status cycle
  };
  const setMainName = (id: string, name: string) => setDay((d) => ({ ...d, mainTasks: d.mainTasks.map((t) => t.id === id ? { ...t, name } : t) }));
  const setTime = (id: string, f: "from" | "to", v: string) => setDay((d) => ({ ...d, mainTasks: d.mainTasks.map((t) => t.id === id ? { ...t, [f]: v } : t) }));
  const delMain = (id: string) => {
    const t = day.mainTasks.find((t) => t.id === id);
    if (!window.confirm(`Delete "${t?.name || "this task"}"?`)) return;
    setDay((d) => ({ ...d, mainTasks: d.mainTasks.filter((t) => t.id !== id) }));
  };
  const addMain = (category: "Mandatory" | "Company" | "Misc") => setDay((d) => ({ ...d, mainTasks: [...d.mainTasks, { id: "t_" + Date.now(), category, name: "New Task", status: "not_started", from: "12:00", to: "13:00", goalLink: "" }] }));
  const setCategoryLabel = (cat: string, label: string) => save({ ...state, categoryLabels: { ...(state.categoryLabels || {}), [cat]: label } });

  const delSub = (id: string) => {
    if (!window.confirm("Delete this task?")) return;
    setDay((d) => ({ ...d, subTasks: d.subTasks.filter((s) => s.id !== id) }));
  };
  const rate = (r: number) => setDay((d) => ({ ...d, rating: r }));
  const delNote = (id: string) => {
    if (!window.confirm("Delete this note?")) return;
    setDay((d) => ({ ...d, managerNotes: d.managerNotes.filter((n) => n.id !== id) }));
  };

  const actionableMainTasks = day.mainTasks.filter(t => t.name.toLowerCase() !== "sleep");
  const doneM = actionableMainTasks.filter((t) => t.status === "done").length;
  const totalM = actionableMainTasks.length;
  const doneS = day.subTasks.filter(i => !i.isSection && i.status === "done").length;
  const totalS = day.subTasks.filter(i => !i.isSection).length;

  const doneF = day.managerNotes.filter(n => n.status === "done").length;
  const totalF = day.managerNotes.length;

  const grouped = day.mainTasks.reduce((a, t) => { (a[t.category] ??= []).push(t); return a; }, {} as Record<string, MainTask[]>);

  // ─── Styles ───
  const sidebar: React.CSSProperties = { width: 240, flexShrink: 0, display: "flex", flexDirection: "column", padding: 24, background: "#fff", borderRight: "1px solid #F0EEEC", height: "100vh", position: "sticky", top: 0 };
  const navBtn = (active: boolean): React.CSSProperties => ({ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: active ? "#EFF6FF" : "transparent", color: active ? "#2563EB" : "#78716C", transition: "all 0.15s", textAlign: "left" });
  const card: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #F0EEEC", boxShadow: "0 1px 2px rgba(28,25,23,0.04)" };
  const gridCols = "130px 1fr 220px 30px";
  const inp: React.CSSProperties = { fontSize: 12, padding: "5px 8px", borderRadius: 8, background: "#FAFAF9", border: "1px solid #E7E5E4", color: "#1C1917" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FAFAF9" }}>
      {/* ─── Fixed Alert Ticker ─── */}
      <AlertTicker />
      <div style={{ display: "flex", flex: 1, paddingTop: 36 }}>
        {/* ─── Sidebar ─── */}
        <aside style={sidebar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
            <img src="/logo_2.png" alt="Devmate Logo" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Command Center</div>
              <div style={{ fontSize: 10, color: "#A8A29E" }}>Devmate Solutions</div>
            </div>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E", marginTop: 8, marginBottom: 8, paddingLeft: 12 }}>
              Roadmap
            </div>
            {([
              ["tasks", LayoutDashboard, "Daily Tasks"],
              ["goals", Target, "Goal Tracker"],
            ] as const).map(([id, Icon, label]) => (
              <button key={id} onClick={() => setTab(id as any)} style={navBtn(tab === id)}>
                <Icon size={17} /> {label}
              </button>
            ))}

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E", marginTop: 24, marginBottom: 8, paddingLeft: 12 }}>
              Tracker
            </div>
            {([
              ["apptracker", Smartphone, "App Tracker"],
              ["content", ImageIcon, "Content Tracker"],
            ] as const).map(([id, Icon, label]) => (
              <button key={id} onClick={() => setTab(id as any)} style={navBtn(tab === id)}>
                <Icon size={17} /> {label}
              </button>
            ))}

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E", marginTop: 24, marginBottom: 8, paddingLeft: 12 }}>
              Management
            </div>
            <button onClick={() => setTab("projects")} style={navBtn(tab === "projects")}>
              <Folders size={17} /> Projects
            </button>
            <button onClick={() => setTab("employees")} style={navBtn(tab === "employees")}>
              <Users size={17} /> Add Employee
            </button>
            <a
              href="https://devmatefinancecenter.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...navBtn(false), textDecoration: "none" }}
            >
              <Banknote size={17} /> Finance Center
            </a>
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
              {/* Kept mounted (hidden via display:none) instead of unmounted so in-progress
                  task drafts in DailyTodos survive switching to another sidebar tab. */}
              <div style={{ display: tab === "tasks" ? "block" : "none" }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                    <div>
                      <h1 style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>
                        {greeting()}, {user.name}
                      </h1>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => go(-1)} style={{ padding: 2, cursor: "pointer" }}><ChevronLeft size={16} color="#A8A29E" /></button>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#78716C" }}>{fmtDate(state.currentDate)}</span>
                        {isToday && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#EFF6FF", color: "#2563EB" }}>Today</span>}
                        <button onClick={() => go(1)} style={{ padding: 2, cursor: "pointer" }}><ChevronRight size={16} color="#A8A29E" /></button>
                      </div>
                    </div>
                  </div>



                  {/* Sliding top container */}
                  <div style={{ marginBottom: 24 }}>
                    <style>{`
                  .no-scrollbar::-webkit-scrollbar {
                    display: none;
                  }
                  .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                `}</style>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => scrollToSlide("timeline")}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: activeSlide === "timeline" ? "#2563EB" : "#A8A29E",
                            background: activeSlide === "timeline" ? "#EFF6FF" : "transparent",
                            border: "none",
                            padding: "4px 10px",
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          Day Timeline
                        </button>
                        <button
                          onClick={() => scrollToSlide("tables")}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: activeSlide === "tables" ? "#2563EB" : "#A8A29E",
                            background: activeSlide === "tables" ? "#EFF6FF" : "transparent",
                            border: "none",
                            padding: "4px 10px",
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          Edit Timeline
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {/* Dots indicator */}
                        <div style={{ display: "flex", gap: 4, marginRight: 8 }}>
                          <div
                            onClick={() => scrollToSlide("timeline")}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: activeSlide === "timeline" ? "#2563EB" : "#E7E5E4",
                              cursor: "pointer",
                              transition: "all 0.15s"
                            }}
                          />
                          <div
                            onClick={() => scrollToSlide("tables")}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: activeSlide === "tables" ? "#2563EB" : "#E7E5E4",
                              cursor: "pointer",
                              transition: "all 0.15s"
                            }}
                          />
                        </div>
                        {/* Arrow button */}
                        <button
                          onClick={() => scrollToSlide(activeSlide === "timeline" ? "tables" : "timeline")}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            border: "1px solid #F0EEEC",
                            background: "#fff",
                            color: "#78716C",
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            transition: "all 0.15s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                        >
                          {activeSlide === "timeline" ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Viewport container */}
                    <div
                      ref={scrollRef}
                      onScroll={handleScroll}
                      className="no-scrollbar"
                      style={{
                        display: "flex",
                        overflowX: "auto",
                        scrollSnapType: "x mandatory",
                        gap: 20,
                        width: "100%",
                        height: viewportHeight,
                        transition: "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        borderRadius: 12
                      }}
                    >
                      {/* Slide 1: Timeline */}
                      <div ref={timelineRef} style={{ flex: "0 0 100%", width: "100%", scrollSnapAlign: "start", height: "fit-content" }}>
                        <TimelineView tasks={day.mainTasks} onTaskClick={cycleMain} />
                      </div>

                      {/* Slide 2: Task Tables */}
                      <div ref={tablesRef} style={{ flex: "0 0 100%", width: "100%", scrollSnapAlign: "start", height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>
                        {(["Mandatory", "Company", "Misc"] as const).map((cat) => {
                          const tasks = grouped[cat];
                          if (!tasks) return null;
                          return (
                            <div key={cat}>
                              <input
                                value={(state.categoryLabels || {})[cat] || CATLABEL[cat]}
                                onChange={(e) => setCategoryLabel(cat, e.target.value)}
                                style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E", marginBottom: 8, background: "transparent", border: "none", outline: "none", width: "100%", padding: 0 }}
                              />

                              <div style={{ ...card, overflow: "hidden" }}>
                                <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 16, padding: "8px 16px", background: "#F9FAFB", borderBottom: "1px solid #F0EEEC" }}>
                                  {["Status", "Task", "Time", ""].map((h, idx) => (
                                    <span key={idx} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>{h}</span>
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
                                          {task.name.toLowerCase() === "sleep" ? (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 14, fontSize: 11, fontWeight: 600, background: "#F5F5F4", color: "#A8A29E" }}>
                                              Routine
                                            </span>
                                          ) : (
                                            <button onClick={() => cycleMain(task.id)}
                                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 14, fontSize: 11, fontWeight: 600, background: SCOLOR[task.status].bg, color: SCOLOR[task.status].fg, transition: "all 0.15s" }}>
                                              {task.status === "done" ? <CheckCircle2 size={12} /> : task.status === "doing" ? <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#D97706" }} /> : <Circle size={12} />}
                                              {SLABEL[task.status]}
                                            </button>
                                          )}
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
                                        {/* Actions */}
                                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                          <button onClick={() => delMain(task.id)} style={{ padding: 4, borderRadius: 6, opacity: 0.5, transition: "opacity 0.15s", cursor: "pointer" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}>
                                            <Trash2 size={13} color="#EF4444" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div style={{ padding: "8px 16px", borderTop: "1px solid #F0EEEC", background: "#FAFAF9" }}>
                                  <button onClick={() => addMain(cat)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#2563EB", cursor: "pointer" }}>
                                    <Plus size={12} /> Add Task
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ─── Daily Task Todos ─── */}
                  <DailyTodos
                    subTasks={day.subTasks as any}
                    managerNotes={day.managerNotes as any}
                    inp={inp}
                    card={card}
                    onDoneForToday={doneForToday}
                    onAddSub={(txt, chips, employee) => {
                      setDay((d) => ({
                        ...d,
                        subTasks: [...d.subTasks, { id: String(Date.now()), parentId: "", text: txt, status: "not_started" as Status, employee, chips }]
                      }));
                    }}
                    onAddSection={(name) => {
                      setDay((d) => ({
                        ...d,
                        subTasks: [...d.subTasks, { id: "sec_" + Date.now(), parentId: "", text: name, status: "not_started" as Status, isSection: true }]
                      }));
                    }}
                    onEditSection={(id, name) => {
                      setDay((d) => ({
                        ...d,
                        subTasks: d.subTasks.map((s) => s.id === id ? { ...s, text: name } : s)
                      }));
                    }}
                    onCycleSub={(id) => setDay((d) => ({ ...d, subTasks: d.subTasks.map((s) => s.id === id ? { ...s, status: SCYCLE[(SCYCLE.indexOf(s.status) + 1) % 3] } : s) }))}
                    onCycleSubChip={(id, chipIdx) => setDay((d) => ({
                      ...d, subTasks: d.subTasks.map((s) => {
                        if (s.id !== id || !s.chips) return s;
                        const newChips = s.chips.map((c, i) => i === chipIdx ? { ...c, status: SCYCLE[(SCYCLE.indexOf(c.status) + 1) % 3] } : c);
                        const allDone = newChips.every(c => c.status === "done");
                        const anyDoing = newChips.some(c => c.status === "doing" || c.status === "done");
                        return { ...s, chips: newChips, status: allDone ? "done" : anyDoing ? "doing" : "not_started" };
                      })
                    }))}
                    onDelSub={(id) => delSub(id)}
                    onAddNote={(txt, chips, employee) => {
                      setDay((d) => ({
                        ...d,
                        managerNotes: [...d.managerNotes, { id: String(Date.now()), date: state.currentDate, content: txt, status: "not_started" as Status, timestamp: Date.now(), employee, chips }]
                      }));
                    }}
                    onCycleNote={(id) => setDay((d) => ({ ...d, managerNotes: d.managerNotes.map((n) => n.id === id ? { ...n, status: SCYCLE[(SCYCLE.indexOf(n.status) + 1) % 3] } : n) }))}
                    onCycleNoteChip={(id, chipIdx) => setDay((d) => ({
                      ...d, managerNotes: d.managerNotes.map((n) => {
                        if (n.id !== id || !n.chips) return n;
                        const newChips = n.chips.map((c, i) => i === chipIdx ? { ...c, status: SCYCLE[(SCYCLE.indexOf(c.status) + 1) % 3] } : c);
                        const allDone = newChips.every(c => c.status === "done");
                        const anyDoing = newChips.some(c => c.status === "doing" || c.status === "done");
                        return { ...n, chips: newChips, status: allDone ? "done" : anyDoing ? "doing" : "not_started" };
                      })
                    }))}
                    onDelNote={delNote}
                    onReorderSubs={(from, to) => setDay((d) => {
                      const arr = [...d.subTasks];
                      const [item] = arr.splice(from, 1);
                      arr.splice(to, 0, item);
                      return { ...d, subTasks: arr };
                    })}
                    onReorderNotes={(from, to) => setDay((d) => {
                      const arr = [...d.managerNotes];
                      const [item] = arr.splice(from, 1);
                      arr.splice(to, 0, item);
                      return { ...d, managerNotes: arr };
                    })}
                    onEditEmployee={(id, list, newEmployee) => {
                      if (list === "daily") {
                        setDay((d) => ({ ...d, subTasks: d.subTasks.map((s) => s.id === id ? { ...s, employee: newEmployee || undefined } : s) }));
                      } else {
                        setDay((d) => ({ ...d, managerNotes: d.managerNotes.map((n) => n.id === id ? { ...n, employee: newEmployee || undefined } : n) }));
                      }
                    }}
                    onEditChip={(id, list, chipIdx, newText) => {
                      if (list === "daily") {
                        setDay((d) => ({
                          ...d, subTasks: d.subTasks.map((s) => {
                            if (s.id !== id) return s;
                            if (chipIdx === -1) return { ...s, text: newText };
                            if (!s.chips) return s;
                            const nc = s.chips.map((c, i) => i === chipIdx ? { ...c, text: newText } : c);
                            return { ...s, chips: nc, text: nc.map((c) => c.text).join(", ") };
                          })
                        }));
                      } else {
                        setDay((d) => ({
                          ...d, managerNotes: d.managerNotes.map((n) => {
                            if (n.id !== id) return n;
                            if (chipIdx === -1) return { ...n, content: newText };
                            if (!n.chips) return n;
                            const nc = n.chips.map((c, i) => i === chipIdx ? { ...c, text: newText } : c);
                            return { ...n, chips: nc, content: nc.map((c) => c.text).join(", ") };
                          })
                        }));
                      }
                    }}
                    onDeleteChip={(id, list, chipIdx) => {
                      if (list === "daily") {
                        setDay((d) => ({
                          ...d, subTasks: d.subTasks.map((s) => {
                            if (s.id !== id || !s.chips) return s;
                            const nc = s.chips.filter((_, i) => i !== chipIdx);
                            const allDone = nc.length > 0 && nc.every((c) => c.status === "done");
                            const anyDoing = nc.some((c) => c.status === "doing" || c.status === "done");
                            return { ...s, chips: nc, text: nc.map((c) => c.text).join(", "), status: (nc.length === 0 ? "not_started" : allDone ? "done" : anyDoing ? "doing" : "not_started") as Status };
                          })
                        }));
                      } else {
                        setDay((d) => ({
                          ...d, managerNotes: d.managerNotes.map((n) => {
                            if (n.id !== id || !n.chips) return n;
                            const nc = n.chips.filter((_, i) => i !== chipIdx);
                            const allDone = nc.length > 0 && nc.every((c) => c.status === "done");
                            const anyDoing = nc.some((c) => c.status === "doing" || c.status === "done");
                            return { ...n, chips: nc, content: nc.map((c) => c.text).join(", "), status: (nc.length === 0 ? "not_started" : allDone ? "done" : anyDoing ? "doing" : "not_started") as Status };
                          })
                        }));
                      }
                    }}
                    onAddChipToRow={(id, list, text) => {
                      if (list === "daily") {
                        setDay((d) => ({
                          ...d, subTasks: d.subTasks.map((s) => {
                            if (s.id !== id) return s;
                            const nc = [...(s.chips || []), { text, status: "not_started" as Status }];
                            return { ...s, chips: nc, text: nc.map((c) => c.text).join(", ") };
                          })
                        }));
                      } else {
                        setDay((d) => ({
                          ...d, managerNotes: d.managerNotes.map((n) => {
                            if (n.id !== id) return n;
                            const nc = [...(n.chips || []), { text, status: "not_started" as Status }];
                            return { ...n, chips: nc, content: nc.map((c) => c.text).join(", ") };
                          })
                        }));
                      }
                    }}
                    mNote={mNote}
                    setMNote={setMNote}
                    projects={state.projects || []}
                    employees={state.employees || []}
                  />






                </div>

              {/* ═══ GOALS TAB ═══ */}
              {tab === "goals" && <GoalPanel state={state} onSave={save} />}

              {/* ═══ APP TRACKER TAB ═══ */}
              {tab === "apptracker" && <AppTrackerPanel state={state} onSave={save} />}

              {/* ═══ CONTENT CREATION TAB ═══ */}
              {tab === "content" && <ContentCreationPanel state={state} onSave={save} />}

              {/* ═══ HISTORY TAB ═══ */}
              {tab === "history" && <HistoryView state={state} onGo={(d) => { save({ ...state, currentDate: d }); setTab("tasks"); }} />}

              {/* ═══ PROJECTS TAB ═══ */}
              {tab === "projects" && <ProjectsPanel state={state} onSave={save} />}

              {/* ═══ EMPLOYEES TAB ═══ */}
              {tab === "employees" && <EmployeesPanel state={state} onSave={save} />}
            </div>

            {/* ═══ RIGHT SIDEBAR (Goals & Meetings) ═══ */}
            <div style={{ width: 320, flexShrink: 0, padding: "28px 32px 28px 0", display: tab === "tasks" ? "block" : "none" }}>
                <div style={{ position: "sticky", top: 28, display: "flex", flexDirection: "column", gap: 32 }}>

                  {/* Daily Meetings Section */}
                  <MeetingsSection
                    meetings={day.meetings || []}
                    projects={state.projects || []}
                    employees={state.employees || []}
                    cardStyle={card}
                    inputStyle={inp}
                    onAddMeeting={addMeeting}
                    onDeleteMeeting={deleteMeeting}
                    onCycleStatus={cycleMeetingStatus}
                  />

                  {/* Employee Tasks Overview Section */}
                  <EmployeeTasksSection
                    employees={state.employees || []}
                    subTasks={day.subTasks || []}
                    managerNotes={day.managerNotes || []}
                    cardStyle={card}
                  />

                  {/* Goals Overview */}
                  {state.goals && state.goals.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Goals Overview</h3>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {state.goals.map((goal) => {
                          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100)) || 0;
                          return (
                            <div
                              key={goal.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggedGoal(goal.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedGoal && draggedGoal !== goal.id) {
                                  const newGoals = [...state.goals];
                                  const sIdx = newGoals.findIndex(g => g.id === draggedGoal);
                                  const tIdx = newGoals.findIndex(g => g.id === goal.id);
                                  const [rem] = newGoals.splice(sIdx, 1);
                                  newGoals.splice(tIdx, 0, rem);
                                  save({ ...state, goals: newGoals });
                                }
                                setDraggedGoal(null);
                              }}
                              style={{ ...card, padding: "16px", cursor: "grab", opacity: draggedGoal === goal.id ? 0.5 : 1 }}
                            >
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
                  )}

                </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Meetings Section Component ─── */
interface MeetingsSectionProps {
  meetings: Meeting[];
  projects: Project[];
  employees: Employee[];
  cardStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  onAddMeeting: (m: Omit<Meeting, "id">) => void;
  onDeleteMeeting: (id: string) => void;
  onCycleStatus: (id: string) => void;
}

function MeetingsSection({
  meetings,
  projects,
  employees,
  cardStyle,
  inputStyle,
  onAddMeeting,
  onDeleteMeeting,
  onCycleStatus,
}: MeetingsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [customProjectName, setCustomProjectName] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [customEmployeeNames, setCustomEmployeeNames] = useState("");
  const [meetingTime, setMeetingTime] = useState("");

  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const empDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (empDropRef.current && !empDropRef.current.contains(event.target as Node)) {
        setShowEmpDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAdd = () => {
    let proj = selectedProjectId;
    if (proj === "custom") {
      proj = customProjectName.trim();
    } else {
      const found = projects.find(p => p.id === selectedProjectId);
      proj = found ? found.name : selectedProjectId;
    }

    if (!proj) {
      alert("Please select or enter a project.");
      return;
    }

    const emps: string[] = [];
    selectedEmployeeIds.forEach(id => {
      const found = employees.find(e => e.id === id);
      if (found) emps.push(found.name);
    });

    if (customEmployeeNames.trim()) {
      customEmployeeNames.split(",").forEach(name => {
        const clean = name.trim();
        if (clean && !emps.includes(clean)) emps.push(clean);
      });
    }

    if (emps.length === 0) {
      alert("Please select or enter at least one employee.");
      return;
    }

    if (!meetingTime.trim()) {
      alert("Please enter a meeting time.");
      return;
    }

    onAddMeeting({
      projectId: proj,
      employeeIds: emps,
      time: meetingTime.trim(),
      status: "not_started"
    });

    setSelectedProjectId("");
    setCustomProjectName("");
    setSelectedEmployeeIds([]);
    setCustomEmployeeNames("");
    setMeetingTime("");
    setShowAddForm(false);
  };

  const getProjectColor = (projName: string) => {
    const found = projects.find(p => p.name === projName);
    return found ? found.color : "#6B7280";
  };

  const initials = (name: string) => {
    return name
      .split(" ")
      .map(w => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const AVATAR_COLORS = [
    "#2563EB", "#8B5CF6", "#EC4899", "#EF4444",
    "#F59E0B", "#10B981", "#06B6D4", "#7C3AED",
  ];

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const statusColorMap: Record<Status, { bg: string; dot: string; text: string; border: string }> = {
    not_started: { bg: "#F3F4F6", dot: "#D1D5DB", text: "#4B5563", border: "#E5E7EB" },
    doing: { bg: "#FFFBEB", dot: "#F59E0B", text: "#D97706", border: "#FDE68A" },
    done: { bg: "#F0FDF4", dot: "#16A34A", text: "#16A34A", border: "#BBF7D0" },
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Daily Meetings</h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: "none", border: "none", color: "#2563EB", fontSize: 11, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 3
            }}
          >
            <Plus size={12} /> Add Meeting
          </button>
        )}
      </div>

      {showAddForm && (
        <div style={{ ...cardStyle, padding: 12, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#78716C" }}>NEW MEETING</span>
            <button
              onClick={() => { setShowAddForm(false); setShowEmpDropdown(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E" }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Project Picker */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 4 }}>PROJECT</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                width: "100%", fontSize: 12, padding: "7px 10px", borderRadius: 8,
                border: "1px solid #E7E5E4", background: "#FAFAF9", outline: "none",
                color: "#1C1917"
              }}
            >
              <option value="">Select Project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="custom">Custom Project...</option>
            </select>
            {selectedProjectId === "custom" && (
              <input
                type="text"
                placeholder="Custom project name..."
                value={customProjectName}
                onChange={(e) => setCustomProjectName(e.target.value)}
                style={{
                  ...inputStyle, marginTop: 6, fontSize: 12, padding: "7px 10px"
                }}
              />
            )}
          </div>

          {/* Employees Picker */}
          <div style={{ position: "relative" }} ref={empDropRef}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 4 }}>EMPLOYEES</label>
            <button
              type="button"
              onClick={() => setShowEmpDropdown(!showEmpDropdown)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                fontSize: 12, padding: "7px 10px", borderRadius: 8, border: "1px solid #E7E5E4",
                background: "#FAFAF9", color: "#1C1917", textAlign: "left", cursor: "pointer"
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                {selectedEmployeeIds.length === 0
                  ? "Select Employees..."
                  : `Selected: ${selectedEmployeeIds.map(id => {
                    const found = employees.find(e => e.id === id);
                    return found ? found.name : "";
                  }).filter(Boolean).join(", ")}`
                }
              </span>
              <ChevronDown size={14} color="#78716C" />
            </button>

            {showEmpDropdown && (
              <div style={{
                position: "absolute", bottom: "100%", left: 0, right: 0, zIndex: 100, marginBottom: 4,
                background: "#fff", borderRadius: 8, border: "1px solid #E7E5E4",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 150, overflowY: "auto", padding: 6
              }}>
                {employees.length === 0 ? (
                  <div style={{ padding: "8px 10px", fontSize: 11, color: "#A8A29E" }}>No employees. Type custom name below.</div>
                ) : (
                  employees.map(emp => {
                    const isChecked = selectedEmployeeIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                          borderRadius: 6, cursor: "pointer", fontSize: 12,
                          background: isChecked ? "#F3F4F6" : "transparent",
                          color: "#1C1917"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== emp.id));
                            } else {
                              setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        />
                        {emp.name}
                      </label>
                    );
                  })
                )}
              </div>
            )}

            <input
              type="text"
              placeholder="Or custom names (comma-separated)..."
              value={customEmployeeNames}
              onChange={(e) => setCustomEmployeeNames(e.target.value)}
              style={{
                ...inputStyle, marginTop: 6, fontSize: 12, padding: "7px 10px"
              }}
            />
          </div>

          {/* Time Input */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 4 }}>TIME</label>
            <div style={{ position: "relative" }}>
              <Clock size={13} color="#A8A29E" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="e.g., 10:30 AM or 14:00"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                style={{
                  ...inputStyle, paddingLeft: 30, fontSize: 12, paddingTop: 7, paddingBottom: 7
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button
              onClick={handleAdd}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "#fff",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 2px 4px rgba(37,99,235,0.15)"
              }}
            >
              Save Meeting
            </button>
            <button
              onClick={() => { setShowAddForm(false); setShowEmpDropdown(false); }}
              style={{
                padding: "7px 12px", borderRadius: 8, border: "1px solid #E7E5E4",
                background: "#fff", color: "#78716C", fontSize: 12, cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Meeting list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {meetings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#A8A29E", border: "1px dashed #E7E5E4", borderRadius: 12 }}>
            <Calendar size={20} style={{ margin: "0 auto 6px", opacity: 0.4 }} />
            <p style={{ fontSize: 11 }}>No meetings scheduled for today.</p>
          </div>
        ) : (
          meetings.map(m => {
            const projColor = getProjectColor(m.projectId);
            const statusConfig = statusColorMap[m.status] || statusColorMap.not_started;
            return (
              <div
                key={m.id}
                style={{
                  ...cardStyle,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  position: "relative",
                  transition: "box-shadow 0.15s"
                }}
                onMouseEnter={(e) => {
                  const delBtn = e.currentTarget.querySelector(".meeting-del-btn") as HTMLElement;
                  if (delBtn) delBtn.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  const delBtn = e.currentTarget.querySelector(".meeting-del-btn") as HTMLElement;
                  if (delBtn) delBtn.style.opacity = "0";
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* Project Tag */}
                    <span
                      style={{
                        padding: "1.5px 6px",
                        borderRadius: 6,
                        background: projColor + "12",
                        color: projColor,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 100
                      }}
                    >
                      {m.projectId}
                    </span>

                    {/* Time */}
                    <span style={{ fontSize: 11, color: "#78716C", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Clock size={11} color="#A8A29E" />
                      {m.time}
                    </span>
                  </div>

                  {/* Employees Avatars List */}
                  <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {m.employeeIds.slice(0, 3).map((empName: string, i: number) => {
                        const avatarBg = getAvatarColor(empName);
                        return (
                          <div
                            key={i}
                            title={empName}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: avatarBg,
                              border: "1.5px solid #fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 9,
                              fontWeight: 700,
                              marginLeft: i > 0 ? -5 : 0,
                              zIndex: 10 - i,
                              flexShrink: 0
                            }}
                          >
                            {initials(empName)}
                          </div>
                        );
                      })}
                      {m.employeeIds.length > 3 && (
                        <div
                          title={m.employeeIds.slice(3).join(", ")}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: "#E7E5E4",
                            border: "1.5px solid #fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#78716C",
                            fontSize: 9,
                            fontWeight: 700,
                            marginLeft: -5,
                            zIndex: 0,
                            flexShrink: 0
                          }}
                        >
                          +{m.employeeIds.length - 3}
                        </div>
                      )}
                    </div>
                    {/* Compact employee name labels if only 1 */}
                    {m.employeeIds.length === 1 && (
                      <span style={{ fontSize: 11, color: "#78716C", marginLeft: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.employeeIds[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status indicator and Delete */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {/* Delete Button (visible on hover) */}
                  <button
                    onClick={() => onDeleteMeeting(m.id)}
                    className="meeting-del-btn"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#EF4444",
                      opacity: 0,
                      cursor: "pointer",
                      padding: 4,
                      borderRadius: 4,
                      transition: "opacity 0.1s"
                    }}
                    title="Delete meeting"
                  >
                    <Trash2 size={13} />
                  </button>

                  {/* Status Circle */}
                  <button
                    onClick={() => onCycleStatus(m.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: statusConfig.bg,
                      border: `1.5px solid ${statusConfig.border}`,
                      cursor: "pointer",
                      padding: 0,
                      transition: "all 0.15s"
                    }}
                    title={`Status: ${m.status.replace("_", " ")} (Click to change)`}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusConfig.dot }} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── Employee Tasks Section Component ─── */
interface EmployeeTasksSectionProps {
  employees: Employee[];
  subTasks: SubTask[];
  managerNotes: ManagerNote[];
  cardStyle: React.CSSProperties;
}

function EmployeeTasksSection({
  employees,
  subTasks,
  managerNotes,
  cardStyle,
}: EmployeeTasksSectionProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getTasksForEmployee = (empName: string) => {
    const cleanName = empName.toLowerCase().trim();
    const searchStr = `@${cleanName}`;
    // regex to strip the @Name tag (case-insensitive) from the displayed text
    const stripRe = new RegExp(`\\s*@${empName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");

    const results: { id: string; text: string; status: Status }[] = [];

    // SubTasks ─ chip-based rows: only include the chips that carry @empName
    subTasks.forEach((s) => {
      if (s.chips && s.chips.length > 0) {
        s.chips.forEach((chip, idx) => {
          if (chip.text.toLowerCase().includes(searchStr)) {
            const cleanText = chip.text.replace(stripRe, "").trim();
            results.push({ id: `${s.id}_c${idx}`, text: cleanText || chip.text, status: chip.status });
          }
        });
      } else {
        // Plain subtask: match via text content or the dedicated employee field
        const textHit = s.text.toLowerCase().includes(searchStr);
        const empHit = s.employee && s.employee.toLowerCase() === cleanName;
        if (textHit || empHit) {
          const cleanText = s.text.replace(stripRe, "").trim();
          results.push({ id: s.id, text: cleanText || s.text, status: s.status });
        }
      }
    });

    // ManagerNotes ─ same logic
    managerNotes.forEach((n) => {
      if (n.chips && n.chips.length > 0) {
        n.chips.forEach((chip, idx) => {
          if (chip.text.toLowerCase().includes(searchStr)) {
            const cleanText = chip.text.replace(stripRe, "").trim();
            results.push({ id: `${n.id}_c${idx}`, text: cleanText || chip.text, status: chip.status });
          }
        });
      } else {
        const textHit = n.content.toLowerCase().includes(searchStr);
        const empHit = n.employee && n.employee.toLowerCase() === cleanName;
        if (textHit || empHit) {
          const cleanText = n.content.replace(stripRe, "").trim();
          results.push({ id: n.id, text: cleanText || n.content, status: n.status });
        }
      }
    });

    return results;
  };

  const statusColorMap = {
    not_started: "#D1D5DB",
    doing: "#F59E0B",
    done: "#16A34A",
  };

  if (employees.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Employee Tasks</h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {employees.map(emp => {
          const tasks = getTasksForEmployee(emp.name);
          const isExpanded = !!expanded[emp.id];

          return (
            <div key={emp.id} style={{ ...cardStyle, overflow: "hidden" }}>
              {/* Employee Row Header */}
              <button
                onClick={() => toggleExpand(emp.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", background: "none", border: "none", cursor: "pointer",
                  textAlign: "left", fontSize: 13, fontWeight: 600, color: "#1C1917"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <span style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s", display: "inline-flex" }}>
                    <ChevronDown size={14} color="#78716C" />
                  </span>
                  <span>{emp.name}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: tasks.length > 0 ? "#8B5CF6" : "#A8A29E", background: tasks.length > 0 ? "#F5F3FF" : "#F5F5F4", padding: "2px 8px", borderRadius: 12 }}>
                  {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </span>
              </button>

              {/* Collapsible Tasks List */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #F0EEEC", background: "#FAFAF9", padding: "8px 12px" }}>
                  {tasks.length === 0 ? (
                    <div style={{ fontSize: 11, color: "#A8A29E", padding: "4px 0" }}>No tasks assigned today.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {tasks.map(t => (
                        <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, padding: "2px 0" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColorMap[t.status as Status] || "#D1D5DB", marginTop: 6, flexShrink: 0 }} />
                          <span style={{ color: t.status === "done" ? "#A8A29E" : "#44403C", textDecoration: t.status === "done" ? "line-through" : "none", wordBreak: "break-word" }}>
                            {t.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
  subTasks,
  managerNotes,
  inp,
  card,
  onDoneForToday,
  onAddSub,
  onAddSection,
  onEditSection,
  onCycleSub,
  onCycleSubChip,
  onDelSub,
  onAddNote,
  onCycleNote,
  onCycleNoteChip,
  onDelNote,
  onReorderSubs,
  onReorderNotes,
  onEditEmployee,
  onEditChip,
  onDeleteChip,
  onAddChipToRow,
  mNote,
  setMNote,
  projects,
  employees,
}: {
  subTasks: SubTask[];
  managerNotes: ManagerNote[];
  inp: React.CSSProperties;
  card: React.CSSProperties;
  onDoneForToday: () => void;
  onAddSub: (text: string, chips?: { text: string; status: Status }[], employee?: string) => void;
  onAddSection: (name: string) => void;
  onEditSection: (id: string, name: string) => void;
  onCycleSub: (id: string) => void;
  onCycleSubChip: (id: string, chipIdx: number) => void;
  onDelSub: (id: string) => void;
  onAddNote: (text: string, chips?: { text: string; status: Status }[], employee?: string) => void;
  onCycleNote: (id: string) => void;
  onCycleNoteChip: (id: string, chipIdx: number) => void;
  onDelNote: (id: string) => void;
  onReorderSubs: (from: number, to: number) => void;
  onReorderNotes: (from: number, to: number) => void;
  onEditEmployee: (id: string, list: "daily" | "manager", newEmployee: string) => void;
  onEditChip: (id: string, list: "daily" | "manager", chipIdx: number, newText: string) => void;
  onDeleteChip: (id: string, list: "daily" | "manager", chipIdx: number) => void;
  onAddChipToRow: (id: string, list: "daily" | "manager", text: string) => void;
  mNote: string;
  setMNote: (v: string) => void;
  projects: Project[];
  employees: Employee[];
}) {
  const [todoTab, setTodoTab] = useState<"daily" | "manager">("daily");
  const [taskInput, setTaskInput] = useState("");
  const [personInput, setPersonInput] = useState("");
  const [pendingChips, setPendingChips] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  // Section heading state
  const [addingSection, setAddingSection] = useState(false);
  const [sectionInput, setSectionInput] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionText, setEditingSectionText] = useState("");

  // ── Project picker dropdown ──
  const [showProjectDrop, setShowProjectDrop] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [isCustomProject, setIsCustomProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ name: string; color: string } | null>(null);
  const projectDropRef = useRef<HTMLDivElement>(null);

  // ── Employee @ mention dropdown ──
  const [showEmpDrop, setShowEmpDrop] = useState(false);
  const [empAtStart, setEmpAtStart] = useState(-1);
  const taskInputRef = useRef<HTMLInputElement>(null);

  // close project drop on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectDropRef.current && !projectDropRef.current.contains(e.target as Node)) {
        setShowProjectDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectProject = (name: string, color: string) => {
    setSelectedProject({ name, color });
    setPersonInput(name);
    setShowProjectDrop(false);
    setProjectFilter("");
    setIsCustomProject(false);
  };

  const handleTaskInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTaskInput(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf("@");
    if (lastAt !== -1) {
      const afterAt = textBeforeCursor.slice(lastAt + 1);
      if (!afterAt.includes(" ")) {
        setEmpAtStart(lastAt);
        setShowEmpDrop(true);
        return;
      }
    }
    setShowEmpDrop(false);
    setEmpAtStart(-1);
  };

  const selectEmployee = (name: string) => {
    const before = taskInput.slice(0, empAtStart);
    const cursorApprox = taskInputRef.current?.selectionStart ?? taskInput.length;
    const fragment = taskInput.slice(empAtStart + 1, cursorApprox);
    const spaceIdx = fragment.indexOf(" ");
    const rest = spaceIdx === -1 ? taskInput.slice(cursorApprox) : taskInput.slice(empAtStart + 1 + spaceIdx);
    setTaskInput(before + "@" + name + " " + rest.trimStart());
    setShowEmpDrop(false);
    setEmpAtStart(-1);
    setTimeout(() => taskInputRef.current?.focus(), 0);
  };

  const empFilter = empAtStart >= 0 ? taskInput.slice(empAtStart + 1).split(" ")[0].toLowerCase() : "";
  const filteredEmployees = employees.filter(em => em.name.toLowerCase().includes(empFilter));

  const queueChip = () => {
    const raw = taskInput.trim();
    if (!raw) return;
    setPendingChips(p => [...p, raw]);
    setTaskInput("");
  };

  const removeChip = (idx: number) => setPendingChips(p => p.filter((_, i) => i !== idx));

  const handleAdd = () => {
    const rawTask = taskInput.trim();
    const chips: { text: string; status: Status }[] = [];

    if (pendingChips.length > 0 || rawTask) {
      const allLabels = rawTask ? [...pendingChips, rawTask] : [...pendingChips];
      allLabels.forEach(t => chips.push({ text: t, status: "not_started" }));
    }

    if (chips.length === 0) return;

    const employee = personInput.trim() || undefined;
    const summary = chips.map(c => c.text).join(", ");

    if (todoTab === "daily") {
      onAddSub(summary, chips, employee);
    } else {
      onAddNote(summary, chips, employee);
    }
    setTaskInput("");
    setPersonInput("");
    setPendingChips([]);
    setMNote("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); queueChip(); }
  };

  const currentList = todoTab === "daily" ? subTasks : managerNotes;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
    color: active ? "#1C1917" : "#A8A29E",
    borderTop: "none", borderLeft: "none", borderRight: "none",
    borderBottom: active ? "2px solid #2563EB" : "1px solid transparent",
    padding: "0 8px 6px", cursor: "pointer", background: "none"
  });

  const chipStatusColor: Record<Status, { bg: string; border: string; text: string; dot: string }> = {
    not_started: { bg: "#F5F5F4", border: "#E7E5E4", text: "#78716C", dot: "#D6D3D1" },
    doing: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", dot: "#F59E0B" },
    done: { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A", dot: "#16A34A" },
  };

  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editingEmployeeText, setEditingEmployeeText] = useState("");
  const [editingChip, setEditingChip] = useState<{ id: string; idx: number } | null>(null);
  const [editingChipText, setEditingChipText] = useState("");
  const [addingChipTo, setAddingChipTo] = useState<string | null>(null);
  const [newChipText, setNewChipText] = useState("");

  const saveEmployee = (id: string) => {
    onEditEmployee(id, todoTab, editingEmployeeText.trim());
    setEditingEmployee(null);
  };
  const saveChip = () => {
    if (editingChip && editingChipText.trim()) {
      onEditChip(editingChip.id, todoTab, editingChip.idx, editingChipText.trim());
    }
    setEditingChip(null);
  };
  const commitNewChip = (id: string) => {
    if (newChipText.trim()) onAddChipToRow(id, todoTab, newChipText.trim());
    setAddingChipTo(null);
    setNewChipText("");
  };

  const doingCount = subTasks.filter(s => !s.isSection && s.status === "doing").length + managerNotes.filter(n => n.status === "doing").length;

  const commitSection = () => {
    const name = sectionInput.trim();
    if (name) onAddSection(name);
    setSectionInput("");
    setAddingSection(false);
  };

  const commitSectionEdit = () => {
    if (editingSectionId && editingSectionText.trim()) {
      onEditSection(editingSectionId, editingSectionText.trim());
    }
    setEditingSectionId(null);
    setEditingSectionText("");
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, borderBottom: "1px solid #F0EEEC", paddingBottom: 0 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button onClick={() => setTodoTab("daily")} style={tabStyle(todoTab === "daily")}>Zain&apos;s Todos</button>
          <button onClick={() => setTodoTab("manager")} style={tabStyle(todoTab === "manager")}>Manager&apos;s Todos</button>
          {/* Add Section button — only show on Zain's tab */}
          {todoTab === "daily" && (
            addingSection ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <input
                  autoFocus
                  value={sectionInput}
                  onChange={(e) => setSectionInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitSection(); if (e.key === "Escape") { setAddingSection(false); setSectionInput(""); } }}
                  onBlur={commitSection}
                  placeholder="Section name…"
                  style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px",
                    borderRadius: 8, border: "1.5px solid #2563EB",
                    background: "#EFF6FF", color: "#2563EB", outline: "none", width: 140,
                  }}
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingSection(true)}
                title="Add a section heading to group tasks"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 10, fontWeight: 700, color: "#A8A29E",
                  background: "none", border: "1px dashed #D1D5DB",
                  borderRadius: 8, padding: "2px 8px", cursor: "pointer",
                  letterSpacing: 0.5, marginBottom: 6, transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.color = "#2563EB"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#D1D5DB"; e.currentTarget.style.color = "#A8A29E"; }}
              >
                <Plus size={10} /> SECTION
              </button>
            )
          )}
        </div>
        {doingCount > 0 && (
          <button
            onClick={onDoneForToday}
            title={`Carry ${doingCount} 'Doing' task${doingCount > 1 ? 's' : ''} to tomorrow`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8, marginBottom: 6,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: "#fff", color: "#1C1917", border: "1px solid #E7E5E4",
              boxShadow: "0 1px 2px rgba(28,25,23,0.04)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
          >
            Done For Today
            <span style={{ background: "#F5F5F4", color: "#78716C", borderRadius: 10, padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>{doingCount}</span>
          </button>
        )}
      </div>

      <div style={{ ...card, padding: 12, marginBottom: 12, background: "#fff" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>

          {/* ── Project Tag Picker ── */}
          <div ref={projectDropRef} style={{ position: "relative", flexShrink: 0 }}>
            {isCustomProject ? (
              <input
                autoFocus
                type="text"
                placeholder="Custom project…"
                value={personInput}
                onChange={(e) => { setPersonInput(e.target.value); setSelectedProject(null); }}
                onKeyDown={(e) => { if (e.key === "Escape") { setIsCustomProject(false); setPersonInput(""); setSelectedProject(null); } }}
                style={{ ...inp, width: 148, fontSize: 13, height: 36, background: "#F5F3FF", border: "1.5px solid #C4B5FD" }}
              />
            ) : (
              <button
                onClick={() => { setShowProjectDrop(v => !v); setProjectFilter(""); }}
                style={{
                  height: 36, padding: "0 12px", borderRadius: 9,
                  border: selectedProject ? `2px solid ${selectedProject.color}` : "1.5px solid #E7E5E4",
                  background: selectedProject ? selectedProject.color + "12" : "#F9FAFB",
                  display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                  fontSize: 13, fontWeight: selectedProject ? 700 : 400,
                  color: selectedProject ? selectedProject.color : "#A8A29E",
                  transition: "all 0.15s", minWidth: 130,
                }}
              >
                {selectedProject
                  ? <><span style={{ width: 8, height: 8, borderRadius: "50%", background: selectedProject.color, flexShrink: 0 }} />@{selectedProject.name}</>
                  : <>@ Project ▾</>}
                {selectedProject && (
                  <span
                    onClick={(e) => { e.stopPropagation(); setSelectedProject(null); setPersonInput(""); }}
                    style={{ marginLeft: "auto", opacity: 0.5, fontSize: 15, lineHeight: 1, cursor: "pointer" }}
                  >×</span>
                )}
              </button>
            )}

            {showProjectDrop && (
              <div style={{
                position: "absolute", top: 42, left: 0, zIndex: 200, minWidth: 200,
                background: "#fff", borderRadius: 12, border: "1px solid #E7E5E4",
                boxShadow: "0 8px 28px rgba(0,0,0,0.12)", overflow: "hidden",
              }}>
                {/* Search */}
                <div style={{ padding: "8px 10px", borderBottom: "1px solid #F0EEEC" }}>
                  <input
                    autoFocus
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    placeholder="Search projects…"
                    style={{
                      width: "100%", fontSize: 12, padding: "6px 10px", borderRadius: 8,
                      border: "1px solid #E7E5E4", background: "#FAFAF9", outline: "none",
                    }}
                  />
                </div>
                {/* Project list */}
                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  {projects
                    .filter(p => p.name.toLowerCase().includes(projectFilter.toLowerCase()))
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => selectProject(p.name, p.color)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 14px", background: "none", border: "none",
                          textAlign: "left", cursor: "pointer", fontSize: 13, fontWeight: 500,
                          color: "#1C1917", transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                        {p.name}
                      </button>
                    ))}
                  {projects.filter(p => p.name.toLowerCase().includes(projectFilter.toLowerCase())).length === 0 && (
                    <div style={{ padding: "10px 14px", fontSize: 12, color: "#A8A29E" }}>No projects found</div>
                  )}
                </div>
                {/* + Custom */}
                <div style={{ borderTop: "1px solid #F0EEEC" }}>
                  <button
                    onClick={() => { setIsCustomProject(true); setShowProjectDrop(false); setPersonInput(""); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8,
                      padding: "9px 14px", background: "none", border: "none",
                      textAlign: "left", cursor: "pointer", fontSize: 13, fontWeight: 600,
                      color: "#2563EB",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#EFF6FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <Plus size={14} /> + Custom
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Pending Chips ── */}
          {pendingChips.map((chip, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#2563EB" }}>
              {chip}
              <button onClick={() => removeChip(i)} style={{ color: "#93C5FD", fontSize: 14, lineHeight: 1, paddingLeft: 2 }}>×</button>
            </div>
          ))}

          {/* ── Task Input with @ Employee mention ── */}
          <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
            <input
              ref={taskInputRef}
              type="text"
              placeholder={`Assign Task… (type @ for employee)`}
              value={taskInput}
              onChange={handleTaskInputChange}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setShowEmpDrop(false); return; }
                if (e.key === "Enter") { e.preventDefault(); if (!showEmpDrop) queueChip(); }
              }}
              style={{ ...inp, width: "100%", fontSize: 13, height: 36 }}
            />
            {/* Employee dropdown */}
            {showEmpDrop && (
              <div style={{
                position: "absolute", top: 42, left: 0, zIndex: 200, minWidth: 180,
                background: "#fff", borderRadius: 12, border: "1px solid #E7E5E4",
                boxShadow: "0 8px 28px rgba(0,0,0,0.12)", overflow: "hidden",
              }}>
                <div style={{ padding: "6px 10px", borderBottom: "1px solid #F0EEEC" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Employees</span>
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {filteredEmployees.length === 0 ? (
                    <div style={{ padding: "10px 14px", fontSize: 12, color: "#A8A29E" }}>No employees — add some in sidebar</div>
                  ) : filteredEmployees.map(em => (
                    <button
                      key={em.id}
                      onMouseDown={(e) => { e.preventDefault(); selectEmployee(em.name); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 14px", background: "none", border: "none",
                        textAlign: "left", cursor: "pointer", fontSize: 13, fontWeight: 500,
                        color: "#1C1917",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F3FF")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                        {em.name[0].toUpperCase()}
                      </span>
                      @{em.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={queueChip}
            title="Queue this task"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", cursor: "pointer", flexShrink: 0 }}
          >
            <Plus size={18} color="#2563EB" />
          </button>
          <button
            onClick={() => { handleAdd(); setSelectedProject(null); setIsCustomProject(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "0 16px", height: 36, borderRadius: 8,
              fontSize: 12, fontWeight: 700, color: "#fff",
              background: todoTab === "daily" ? "#2563EB" : "#8B5CF6",
              cursor: "pointer", border: "none", flexShrink: 0,
            }}
          >
            Add Task
          </button>
        </div>
      </div>

      {currentList.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {currentList.map((item, index) => {
            const isSection = !!(item as any).isSection;
            const chips = (item as any).chips as { text: string; status: Status }[] | undefined;
            const employee = (item as any).employee as string | undefined;
            const overallStatus: Status = (item as any).status || "not_started";
            const isChipTask = chips && chips.length > 0;
            const isDragging = dragIdx === index;
            const isOver = dragOver === index;

            // ── Section heading row ──
            if (isSection) {
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragIdx(index)}
                  onDragEnd={() => { setDragIdx(null); setDragOver(null); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(index); }}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== index) {
                      todoTab === "daily" ? onReorderSubs(dragIdx, index) : onReorderNotes(dragIdx, index);
                    }
                    setDragIdx(null); setDragOver(null);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    marginTop: index > 0 ? 6 : 0, marginBottom: 2,
                    cursor: "grab",
                    opacity: isDragging ? 0.4 : 1,
                    transform: isOver && !isDragging ? "scale(1.01)" : "scale(1)",
                    transition: "all 0.15s",
                  }}
                >
                  {/* drag handle */}
                  <span style={{ color: "#D1D5DB", fontSize: 14, lineHeight: 1, userSelect: "none", flexShrink: 0 }}>⠿</span>
                  <div style={{ flex: 1, height: 1, background: isOver && !isDragging ? "#2563EB" : "#E7E5E4", transition: "background 0.15s" }} />
                  {editingSectionId === item.id ? (
                    <input
                      autoFocus
                      value={editingSectionText}
                      onChange={(e) => setEditingSectionText(e.target.value)}
                      onBlur={commitSectionEdit}
                      onKeyDown={(e) => { if (e.key === "Enter") commitSectionEdit(); if (e.key === "Escape") { setEditingSectionId(null); } }}
                      style={{
                        fontSize: 11, fontWeight: 800, letterSpacing: 1,
                        textTransform: "uppercase", color: "#44403C",
                        background: "#F5F5F4", border: "1.5px solid #2563EB",
                        borderRadius: 6, padding: "2px 8px", outline: "none", width: 140,
                      }}
                    />
                  ) : (
                    <button
                      onDoubleClick={() => { setEditingSectionId(item.id); setEditingSectionText((item as any).text || ""); }}
                      title="Double-click to rename · drag to reorder"
                      style={{
                        fontSize: 11, fontWeight: 800, letterSpacing: 1,
                        textTransform: "uppercase", color: "#78716C",
                        background: "none", border: "none", padding: "0 4px",
                        cursor: "grab", whiteSpace: "nowrap",
                      }}
                    >
                      {(item as any).text || "Section"}
                    </button>
                  )}
                  <div style={{ flex: 1, height: 1, background: isOver && !isDragging ? "#2563EB" : "#E7E5E4", transition: "background 0.15s" }} />
                  <button
                    onClick={() => onDelSub(item.id)}
                    title="Delete section"
                    style={{ padding: 3, opacity: 0.35, transition: "opacity 0.15s", color: "#EF4444", background: "none", border: "none", cursor: "pointer", display: "flex" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.35")}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            }

            // Check if this task is inside a section (i.e. a section heading exists before it)
            const hasSectionAbove = currentList.slice(0, index).some((r) => !!(r as any).isSection);

            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDragIdx(index)}
                onDragEnd={() => { setDragIdx(null); setDragOver(null); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(index); }}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== index) {
                    todoTab === "daily" ? onReorderSubs(dragIdx, index) : onReorderNotes(dragIdx, index);
                  }
                  setDragIdx(null); setDragOver(null);
                }}
                style={{
                  ...card,
                  padding: "12px 16px 10px",
                  position: "relative",
                  marginLeft: hasSectionAbove ? 12 : 0,
                  borderLeft: `3px solid ${overallStatus === "done" ? "#16A34A" : overallStatus === "doing" ? "#F59E0B" : "#E7E5E4"}`,
                  transition: "all 0.2s",
                  opacity: isDragging ? 0.4 : 1,
                  transform: isOver && !isDragging ? "scale(1.01)" : "scale(1)",
                  boxShadow: isOver && !isDragging ? "0 4px 16px rgba(37,99,235,0.13)" : undefined,
                  cursor: "grab",
                }}>
                {isChipTask ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {/* Chips */}
                    {chips!.map((chip, idx) => {
                      const cs = chipStatusColor[chip.status];
                      const isEditingThis = editingChip?.id === item.id && editingChip?.idx === idx;
                      return (
                        <div key={idx} style={{ display: "inline-flex", alignItems: "stretch" }}>
                          {isEditingThis ? (
                            <input
                              autoFocus
                              value={editingChipText}
                              onChange={(e) => setEditingChipText(e.target.value)}
                              onBlur={saveChip}
                              onKeyDown={(e) => { if (e.key === "Enter") saveChip(); if (e.key === "Escape") setEditingChip(null); }}
                              style={{
                                fontSize: 12, fontWeight: 600, padding: "4px 10px",
                                borderRadius: 20, border: "1.5px solid #2563EB",
                                background: "#EFF6FF", color: "#2563EB",
                                outline: "none", width: Math.max(70, editingChipText.length * 8 + 20),
                              }}
                            />
                          ) : (
                            <>
                              <button
                                onClick={() => todoTab === "daily" ? onCycleSubChip(item.id, idx) : onCycleNoteChip(item.id, idx)}
                                title="Click to cycle status · double-click text to rename"
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  background: cs.bg, border: `1px solid ${cs.border}`,
                                  borderRadius: "20px 0 0 20px", padding: "4px 8px 4px 10px",
                                  fontSize: 12, fontWeight: 600, color: cs.text,
                                  cursor: "pointer", transition: "all 0.2s",
                                }}
                              >
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: cs.dot, flexShrink: 0, ...(chip.status === "done" ? { boxShadow: `0 0 0 2px ${cs.dot}40` } : {}) }} />
                                <span
                                  style={{ textDecoration: chip.status === "done" ? "line-through" : "none" }}
                                  onDoubleClick={(e) => { e.stopPropagation(); setEditingChip({ id: item.id, idx }); setEditingChipText(chip.text); }}
                                  title="Double-click to rename"
                                >
                                  {chip.text}
                                </span>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteChip(item.id, todoTab, idx); }}
                                title="Remove this task"
                                style={{
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  borderTop: `1px solid ${cs.border}`,
                                  borderRight: `1px solid ${cs.border}`,
                                  borderBottom: `1px solid ${cs.border}`,
                                  borderLeft: "none",
                                  borderRadius: "0 20px 20px 0",
                                  background: cs.bg, color: cs.text,
                                  padding: "4px 7px", cursor: "pointer",
                                  fontSize: 13, lineHeight: 1, opacity: 0.55,
                                  transition: "opacity 0.15s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.55")}
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* + add chip inline */}
                    {addingChipTo === item.id ? (
                      <input
                        autoFocus
                        value={newChipText}
                        onChange={(e) => setNewChipText(e.target.value)}
                        onBlur={() => commitNewChip(item.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitNewChip(item.id); if (e.key === "Escape") { setAddingChipTo(null); setNewChipText(""); } }}
                        placeholder="New task…"
                        style={{
                          fontSize: 12, fontWeight: 600, padding: "4px 10px",
                          borderRadius: 20, border: "1.5px dashed #2563EB",
                          background: "#EFF6FF", color: "#2563EB", outline: "none", width: 110,
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => { setAddingChipTo(item.id); setNewChipText(""); }}
                        title="Add another task to this row"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          background: "#F9FAFB", border: "1px dashed #D1D5DB",
                          borderRadius: 20, padding: "4px 10px",
                          fontSize: 11, fontWeight: 600, color: "#9CA3AF",
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.color = "#2563EB"; e.currentTarget.style.background = "#EFF6FF"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#D1D5DB"; e.currentTarget.style.color = "#9CA3AF"; e.currentTarget.style.background = "#F9FAFB"; }}
                      >
                        <Plus size={11} /> task
                      </button>
                    )}

                    {/* Editable @employee tag aligned horizontally */}
                    <div style={{ marginLeft: 4 }}>
                      {editingEmployee === item.id ? (
                        <input
                          autoFocus
                          value={editingEmployeeText}
                          onChange={(e) => setEditingEmployeeText(e.target.value)}
                          onBlur={() => saveEmployee(item.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEmployee(item.id); if (e.key === "Escape") setEditingEmployee(null); }}
                          placeholder="Employee…"
                          style={{
                            fontSize: 11, fontWeight: 700, color: "#8B5CF6",
                            background: "#F5F3FF", border: "1px solid #C4B5FD",
                            borderRadius: 8, padding: "2px 8px", outline: "none", width: 100,
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingEmployee(item.id); setEditingEmployeeText(employee || ""); }}
                          title="Click to edit employee"
                          style={{
                            fontSize: 11, fontWeight: 700,
                            color: employee ? "#8B5CF6" : "#D1D5DB",
                            background: "none", border: "1px dashed transparent",
                            borderRadius: 8, padding: "2px 6px",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C4B5FD"; e.currentTarget.style.background = "#F5F3FF"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "none"; }}
                        >
                          {employee ? `@${employee}` : "+ assign"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Plain task (no chips) */
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        onClick={() => todoTab === "daily" ? onCycleSub(item.id) : onCycleNote(item.id)}
                        style={{ flexShrink: 0, display: "flex", border: "none", background: "none", cursor: "pointer" }}
                      >
                        {overallStatus === "done"
                          ? <CheckCircle2 size={16} color="#16A34A" />
                          : overallStatus === "doing"
                            ? <Circle size={16} color="#D97706" fill="#D97706" />
                            : <Circle size={16} color="#D6D3D1" />}
                      </button>

                      {editingChip?.id === item.id && editingChip?.idx === -1 ? (
                        <input
                          autoFocus
                          value={editingChipText}
                          onChange={(e) => setEditingChipText(e.target.value)}
                          onBlur={() => {
                            if (editingChip && editingChipText.trim()) {
                              onEditChip(item.id, todoTab, -1, editingChipText);
                            }
                            setEditingChip(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (editingChipText.trim()) {
                                onEditChip(item.id, todoTab, -1, editingChipText);
                              }
                              setEditingChip(null);
                            }
                            if (e.key === "Escape") setEditingChip(null);
                          }}
                          style={{
                            fontSize: 13, fontWeight: 500, flex: 1,
                            background: "#F3F4F6", border: "1px solid #D1D5DB",
                            borderRadius: 4, padding: "2px 6px", outline: "none"
                          }}
                        />
                      ) : (
                        <span
                          onDoubleClick={() => { setEditingChip({ id: item.id, idx: -1 }); setEditingChipText((item as any).text || (item as any).content || ""); }}
                          style={{ fontSize: 13, fontWeight: 500, flex: 1, color: overallStatus === "done" ? "#A8A29E" : "#44403C", textDecoration: overallStatus === "done" ? "line-through" : "none", cursor: "text" }}
                          title="Double-click to edit"
                        >
                          {(item as any).text || (item as any).content || "Empty task"}
                        </span>
                      )}
                    </div>

                    {/* Employee tag for plain task aligned horizontally */}
                    <div>
                      {editingEmployee === item.id ? (
                        <input
                          autoFocus
                          value={editingEmployeeText}
                          onChange={(e) => setEditingEmployeeText(e.target.value)}
                          onBlur={() => saveEmployee(item.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEmployee(item.id); if (e.key === "Escape") setEditingEmployee(null); }}
                          placeholder="Employee…"
                          style={{
                            fontSize: 11, fontWeight: 700, color: "#8B5CF6",
                            background: "#F5F3FF", border: "1px solid #C4B5FD",
                            borderRadius: 8, padding: "2px 8px", outline: "none", width: 100,
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingEmployee(item.id); setEditingEmployeeText(employee || ""); }}
                          title="Click to edit employee"
                          style={{
                            fontSize: 11, fontWeight: 700,
                            color: employee ? "#8B5CF6" : "#D1D5DB",
                            background: "none", border: "1px dashed transparent",
                            borderRadius: 8, padding: "2px 6px",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C4B5FD"; e.currentTarget.style.background = "#F5F3FF"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "none"; }}
                        >
                          {employee ? `@${employee}` : "+ assign"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => todoTab === "daily" ? onDelSub(item.id) : onDelNote(item.id)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", padding: 4, opacity: 0.3, transition: "opacity 0.15s", color: "#EF4444" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.3")}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
