"use client";
// AlertTicker: persisted in localStorage for simplicity (not in AppState)
import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, Target, Calendar, LogOut, ChevronLeft, ChevronRight,
  Plus, Star, Flame, CheckCircle2, Circle, Loader2, Trash2, MessageSquare, Moon, Smartphone, Archive, Download, ExternalLink, Image as ImageIcon, Banknote, Folders, Users, Clock, ChevronDown, ChevronUp, X, Pencil, MapPin, Tag, Filter, Repeat, ArrowRight, Layers
} from "lucide-react";
import { loadState, saveState, createDayData, logout, calculateStreaks, getToday } from "@/lib/store";
import { AppState, Goal, MainTask, SubTask, ManagerNote, Status, User, Project, Employee, Meeting, EventItem, EventCategory, EventRecurrence, TaskChip, SubTaskItem } from "@/lib/types";
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

/* ─── Meeting Time & Extraction Helpers ─── */
function hasTimeTag(str?: string): boolean {
  if (!str) return false;
  // 1. Matches @H:MM or @HH:MM with optional am/pm (e.g. @2:30, @10:30am)
  if (/@\d{1,2}:\d{2}(?:am|pm)?\b/i.test(str)) return true;
  // 2. Matches @H or @HH with explicit am/pm (e.g. @6pm, @11am)
  if (/@\d{1,2}(?:am|pm)\b/i.test(str)) return true;
  // 3. Matches 3-4 digit military/shortcut time like @230, @400, @1030, @1430
  if (/@(?:[1-9][0-5][0-9]|(?:[01][0-9]|2[0-3])[0-5][0-9])(?:am|pm)?\b/i.test(str)) return true;
  // 4. Matches single/double digit standalone hours like @1 through @12 (e.g. @6, @9, @11)
  if (/@(?:[1-9]|1[0-2])\b/i.test(str)) return true;
  return false;
}

function parseMeetingId(id: string): { isTaskMeeting: boolean; taskId: string; chipIdx: number } {
  if (id.startsWith("taskmeet::")) {
    const parts = id.slice("taskmeet::".length).split("::");
    const taskId = parts[0];
    const chipIdx = parts[1] === "plain" ? -1 : parseInt(parts[1], 10);
    return { isTaskMeeting: true, taskId, chipIdx: isNaN(chipIdx) ? -1 : chipIdx };
  }

  if (id.startsWith("taskmeet_")) {
    // Backward compatibility for old ID format
    const raw = id.slice("taskmeet_".length);
    const lastUnderscore = raw.lastIndexOf("_");
    const lastSegment = raw.slice(lastUnderscore + 1);
    if (lastUnderscore !== -1 && /^\d+$/.test(lastSegment)) {
      const taskId = raw.slice(0, lastUnderscore);
      const chipIdx = parseInt(lastSegment, 10);
      return { isTaskMeeting: true, taskId, chipIdx: isNaN(chipIdx) ? -1 : chipIdx };
    } else {
      return { isTaskMeeting: true, taskId: raw, chipIdx: -1 };
    }
  }

  return { isTaskMeeting: false, taskId: "", chipIdx: -1 };
}

function parseMeetingTime(text: string): { cleanText: string; time: string } {
  let clean = text;
  let time = "";

  // 1. Remove @Meet or @Meeting or @Meetings (case-insensitive)
  clean = clean.replace(/@meets?\b|@meetings?\b/gi, "").trim();

  // 2. Look for @time pattern with optional space before am/pm:
  // e.g. @2:30 PM, @2:30pm, @6pm, @230, @400, @1030, @6, @11
  const timeMatch = clean.match(/@(\d{1,2}:\d{2}(?:\s*[ap]m)?|\d{1,2}(?:\s*[ap]m)|\d{3,4}(?:\s*[ap]m)?|[1-9]\b|1[0-2]\b)/i);
  if (timeMatch) {
    const raw = timeMatch[1].toLowerCase().replace(/\s+/g, "");
    clean = clean.replace(timeMatch[0], "").trim();

    if (raw.includes(":")) {
      const parts = raw.split(":");
      const hour = parseInt(parts[0], 10);
      const min = parts[1].replace(/[^\d]/g, "");
      if (!raw.includes("am") && !raw.includes("pm")) {
        time = `${hour}:${min} ${hour >= 8 && hour <= 11 ? "AM" : "PM"}`;
      } else {
        time = `${hour}:${min} ${raw.includes("am") ? "AM" : "PM"}`;
      }
    } else if (raw.endsWith("am") || raw.endsWith("pm")) {
      const isAm = raw.endsWith("am");
      const numPart = raw.replace(/[^\d]/g, "");
      time = `${numPart}:00 ${isAm ? "AM" : "PM"}`;
    } else if (raw.length === 3) {
      // e.g. 230 -> 2:30 PM, 915 -> 9:15 AM/PM
      const hour = parseInt(raw[0], 10);
      const min = raw.slice(1);
      time = `${hour}:${min} ${hour >= 8 && hour <= 11 ? "AM" : "PM"}`;
    } else if (raw.length === 4) {
      // e.g. 1030 -> 10:30 AM, 0400 -> 4:00 PM, 1430 -> 2:30 PM
      const hour = parseInt(raw.slice(0, 2), 10);
      const min = raw.slice(2);
      if (hour > 12) {
        time = `${hour - 12}:${min} PM`;
      } else if (hour === 12) {
        time = `12:${min} PM`;
      } else {
        time = `${hour}:${min} ${hour >= 8 && hour < 12 ? "AM" : "PM"}`;
      }
    } else {
      // e.g. 6 or 11
      const hour = parseInt(raw, 10);
      time = `${hour}:00 ${hour >= 8 && hour <= 11 ? "AM" : "PM"}`;
    }
  }

  // Strip any lingering duplicate AM/PM or leading/trailing punctuation
  clean = clean.replace(/\b(am|pm)\b/gi, "").trim();
  clean = clean.replace(/^[@\-:\s]+|[@\-:\s]+$/g, "").trim();

  return {
    cleanText: clean || text,
    time: time || "Scheduled",
  };
}

export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 9999;
  const str = timeStr.trim().toLowerCase();
  if (!str || str === "scheduled") return 9999;

  const isPm = /\bpm\b|pm/i.test(str);
  const isAm = /\bam\b|am/i.test(str);

  let hour = 0;
  let min = 0;

  if (str.includes(":")) {
    const parts = str.split(":");
    hour = parseInt(parts[0].replace(/[^\d]/g, ""), 10);
    min = parseInt(parts[1].replace(/[^\d]/g, ""), 10) || 0;
  } else {
    const numOnly = str.replace(/[^\d]/g, "");
    if (numOnly.length === 3) {
      hour = parseInt(numOnly[0], 10);
      min = parseInt(numOnly.slice(1), 10);
    } else if (numOnly.length === 4) {
      hour = parseInt(numOnly.slice(0, 2), 10);
      min = parseInt(numOnly.slice(2), 10);
    } else if (numOnly.length >= 1 && numOnly.length <= 2) {
      hour = parseInt(numOnly, 10);
      min = 0;
    } else {
      return 9999;
    }
  }

  if (isNaN(hour) || isNaN(min)) return 9999;

  if (isPm) {
    if (hour < 12) hour += 12;
  } else if (isAm) {
    if (hour === 12) hour = 0;
  } else {
    // If no explicit AM/PM:
    // Hours 1..6 are typically afternoon/PM meetings (1pm to 6pm)
    // Hours 7..11 are morning/AM meetings (7am to 11am)
    // Hour 12 is 12pm (noon)
    // Hour > 12 is already 24-hour time
    if (hour >= 1 && hour <= 6) {
      hour += 12;
    }
  }

  return hour * 60 + min;
}


function extractMeetingsFromTasks(
  subTasks: SubTask[],
  managerNotes: ManagerNote[]
): {
  meeting: Meeting;
  sourceId: string;
  sourceType: "chip" | "plain";
  chipIdx?: number;
  isNote?: boolean;
}[] {
  const list: {
    meeting: Meeting;
    sourceId: string;
    sourceType: "chip" | "plain";
    chipIdx?: number;
    isNote?: boolean;
  }[] = [];

  const isMeetingKeyword = (str?: string) =>
    !!str && (/@meets?\b|@meetings?\b/i.test(str) || hasTimeTag(str));

  const isMeetingRow = (str?: string) =>
    !!str &&
    (isMeetingKeyword(str) ||
      str.toLowerCase().trim() === "meetings" ||
      str.toLowerCase().trim() === "meeting" ||
      str.toLowerCase().trim() === "@meetings" ||
      str.toLowerCase().trim() === "@meeting");

  const processItem = (
    item: { id: string; text?: string; content?: string; chips?: TaskChip[]; employee?: string; status: Status; isSection?: boolean },
    isNote: boolean
  ) => {
    if (item.isSection) return;

    const rowEmployee = (item.employee || "").trim();
    const rowIsMeeting = isMeetingRow(rowEmployee);

    if (item.chips && item.chips.length > 0) {
      item.chips.forEach((chip, cIdx) => {
        const chipHasMeeting = isMeetingKeyword(chip.text);
        if (rowIsMeeting || chipHasMeeting) {
          const parsed = parseMeetingTime(chip.text);
          const projName = parsed.cleanText || (rowEmployee ? rowEmployee.replace(/^@/, "") : "Meeting");
          const empClean = rowEmployee.replace(/^@/, "").trim();
          const employeeIds = !rowIsMeeting && empClean ? [empClean] : [];

          list.push({
            meeting: {
              id: `taskmeet::${item.id}::${cIdx}`,
              projectId: projName,
              employeeIds,
              time: parsed.time,
              status: chip.status,
            },
            sourceId: item.id,
            sourceType: "chip",
            chipIdx: cIdx,
            isNote,
          });
        }
      });
    } else {
      const text = item.text || item.content || "";
      const textHasMeeting = isMeetingKeyword(text);
      if (rowIsMeeting || textHasMeeting) {
        const parsed = parseMeetingTime(text);
        const projName = parsed.cleanText || (rowEmployee ? rowEmployee.replace(/^@/, "") : "Meeting");
        const empClean = rowEmployee.replace(/^@/, "").trim();
        const employeeIds = !rowIsMeeting && empClean ? [empClean] : [];

        list.push({
          meeting: {
            id: `taskmeet::${item.id}::plain`,
            projectId: projName,
            employeeIds,
            time: parsed.time,
            status: item.status,
          },
          sourceId: item.id,
          sourceType: "plain",
          isNote,
        });
      }
    }
  };

  (subTasks || []).forEach((s) => processItem(s, false));
  (managerNotes || []).forEach((n) => processItem(n, true));

  return list;
}

function parseEventId(id: string): { isTaskEvent: boolean; taskId: string; chipIdx: number } {
  if (id.startsWith("taskevent::")) {
    const parts = id.slice("taskevent::".length).split("::");
    const taskId = parts[0];
    const chipIdx = parts[1] === "plain" ? -1 : parseInt(parts[1], 10);
    return { isTaskEvent: true, taskId, chipIdx: isNaN(chipIdx) ? -1 : chipIdx };
  }
  return { isTaskEvent: false, taskId: "", chipIdx: -1 };
}

function extractEventsFromTasks(
  subTasks: SubTask[],
  managerNotes: ManagerNote[]
): {
  event: EventItem;
  sourceId: string;
  sourceType: "chip" | "plain";
  chipIdx?: number;
  isNote?: boolean;
}[] {
  const list: {
    event: EventItem;
    sourceId: string;
    sourceType: "chip" | "plain";
    chipIdx?: number;
    isNote?: boolean;
  }[] = [];

  const isEventKeyword = (str?: string) =>
    !!str && (/@events?\b/i.test(str) || /\b(luma|meetup|webinar)\b/i.test(str));

  const isEventRow = (str?: string) => {
    if (!str) return false;
    const s = str.toLowerCase().replace(/^@/, "").trim();
    return s === "events" || s === "event" || s === "ours" || s === "imp" || s === "others";
  };

  const determineCategory = (text: string, rowText: string): EventCategory => {
    const combined = (text + " " + rowText).toLowerCase();
    if (combined.includes("eventsjoin") || combined.includes("imp") || combined.includes("important") || combined.includes("others") || combined.includes("other") || combined.includes("join")) {
      return "Others";
    }
    return "Ours";
  };

  const processItem = (
    item: { id: string; text?: string; content?: string; chips?: TaskChip[]; employee?: string; status: Status; isSection?: boolean },
    isNote: boolean
  ) => {
    if (item.isSection) return;
    const rowEmployee = (item.employee || "").trim();
    const rowIsEvent = isEventRow(rowEmployee);

    if (item.chips && item.chips.length > 0) {
      item.chips.forEach((chip, cIdx) => {
        const chipIsEvent = isEventKeyword(chip.text);
        if (rowIsEvent || chipIsEvent) {
          const category = determineCategory(chip.text, rowEmployee);
          let title = chip.text.replace(/@events?(?:self|join)?\b/gi, "").trim();
          if (!title) title = chip.text;
          const subInfo = chip.subtasks && chip.subtasks.length > 0
            ? ` (${chip.subtasks.filter((st) => st.status === "done").length}/${chip.subtasks.length})`
            : "";

          const timeMatch = chip.text.match(/@(\d{1,2}(?::\d{2})?(?:am|pm)?|\d{3,4})/i);
          const time = timeMatch ? timeMatch[0].replace(/^@/, "") : undefined;
          let location: string | undefined;
          if (/luma/i.test(chip.text)) location = "Luma";
          else if (/meetup/i.test(chip.text)) location = "MeetUp";
          else if (/zoom/i.test(chip.text)) location = "Zoom";
          else if (/whatsapp/i.test(chip.text)) location = "WhatsApp";

          list.push({
            event: {
              id: `taskevent::${item.id}::${cIdx}`,
              title: title + subInfo,
              category,
              time,
              location,
              status: chip.status,
            },
            sourceId: item.id,
            sourceType: "chip",
            chipIdx: cIdx,
            isNote,
          });
        }
      });
    } else {
      const text = item.text || item.content || "";
      const textIsEvent = isEventKeyword(text);
      if (rowIsEvent || textIsEvent) {
        const category = determineCategory(text, rowEmployee);
        let title = text.replace(/@events?(?:self|join)?\b/gi, "").trim();
        if (!title) title = text;

        const timeMatch = text.match(/@(\d{1,2}(?::\d{2})?(?:am|pm)?|\d{3,4})/i);
        const time = timeMatch ? timeMatch[0].replace(/^@/, "") : undefined;
        let location: string | undefined;
        if (/luma/i.test(text)) location = "Luma";
        else if (/meetup/i.test(text)) location = "MeetUp";
        else if (/zoom/i.test(text)) location = "Zoom";
        else if (/whatsapp/i.test(text)) location = "WhatsApp";

        list.push({
          event: {
            id: `taskevent::${item.id}::plain`,
            title,
            category,
            time,
            location,
            status: item.status,
          },
          sourceId: item.id,
          sourceType: "plain",
          isNote,
        });
      }
    }
  };

  (subTasks || []).forEach((s) => processItem(s, false));
  (managerNotes || []).forEach((n) => processItem(n, true));

  return list;
}

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const userName = (user?.name || "Zain")
    .replace(/(\s*(&|and)\s*Fatima|Fatima\s*(&|and)?\s*)/gi, "")
    .trim() || "Zain";

  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<"tasks" | "goals" | "apptracker" | "content" | "history" | "projects" | "employees">("tasks");
  const [mNote, setMNote] = useState("");
  const [draggedGoal, setDraggedGoal] = useState<string | null>(null);

  // Clean Fatima from employees and local session storage
  useEffect(() => {
    if (state && state.employees && state.employees.some((e) => e.name.toLowerCase().includes("fatima"))) {
      save({
        ...state,
        employees: state.employees.filter((e) => !e.name.toLowerCase().includes("fatima")),
      });
    }
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("devmate_auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.name && /fatima/i.test(parsed.name)) {
            parsed.name = parsed.name.replace(/(\s*(&|and)\s*Fatima|Fatima\s*(&|and)?\s*)/gi, "").trim() || "Zain";
            localStorage.setItem("devmate_auth", JSON.stringify(parsed));
          }
        }
      } catch {}
    }
  }, [state]);

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
  const isToday = state.currentDate === getToday();

  const go = (off: number) => {
    const d = new Date(state.currentDate + "T12:00:00");
    d.setDate(d.getDate() + off);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const nd = `${year}-${month}-${day}`;
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
    const nYear = nextDate.getFullYear();
    const nMonth = String(nextDate.getMonth() + 1).padStart(2, "0");
    const nDay = String(nextDate.getDate()).padStart(2, "0");
    const nextKey = `${nYear}-${nMonth}-${nDay}`;

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
          // Chips that are NOT done carry forward (not_started + doing → reset to not_started)
          const incompleteChips = t.chips.filter((c) => c.status !== "done");
          const doneChips = t.chips.filter((c) => c.status === "done");

          if (incompleteChips.length > 0) {
            const resetChips = incompleteChips.map((c) => ({
              ...c,
              status: "not_started" as Status,
              subtasks: c.subtasks ? c.subtasks.map((st) => ({ ...st, status: "not_started" as Status })) : undefined,
            }));
            const newText = resetChips.map((c) => c.text).join(", ");
            carriedTasksInBlock.push({
              ...t,
              id: prefix + t.id,
              status: "not_started" as Status,
              chips: resetChips,
              text: newText,
            });
          }

          // Only fully-done chips stay on today as a record
          if (doneChips.length > 0) {
            const text = doneChips.map((c) => c.text).join(", ");
            remainingTasksInBlock.push({
              ...t,
              chips: doneChips,
              status: "done" as Status,
              text,
            });
          }
        } else {
          // Plain task without chips: carry if not done, keep on today only if done
          if (t.status !== "done") {
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

      // Today's list: keep section only if it has done tasks (as a record)
      if (remainingTasksInBlock.length > 0) {
        if (block.section) newTodaySubTasks.push(block.section);
        newTodaySubTasks.push(...remainingTasksInBlock);
      }

      // Tomorrow's list: carry section along with its incomplete tasks
      if (carriedTasksInBlock.length > 0 || block.section) {
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
          const resetChips = doingChips.map((c) => ({
            ...c,
            status: "not_started" as Status,
            subtasks: c.subtasks ? c.subtasks.map((st) => ({ ...st, status: "not_started" as Status })) : undefined,
          }));
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

    // 4. Process meetings & events
    const carryMeetings = (td.meetings || []).filter((m) => m.status === "not_started" || m.status === "doing");
    const remainingMeetings = (td.meetings || []).filter((m) => m.status === "done");

    const carriedMeetings = carryMeetings.map((m) => ({
      ...m,
      id: prefix + m.id,
      status: "not_started" as Status,
    }));

    const carryEvents = (td.events || []).filter((e) => e.status === "not_started" || e.status === "doing");
    const remainingEvents = (td.events || []).filter((e) => e.status === "done");

    const carriedEvents = carryEvents.map((e) => ({
      ...e,
      id: prefix + e.id,
      status: "not_started" as Status,
    }));

    // Check if there is anything to carry forward (tasks or sections with tasks)
    const totalCarriedTasks = carriedBlocks.reduce((acc, b) => acc + b.tasks.length, 0);
    const totalCarriedSections = carriedBlocks.filter((b) => b.section && b.tasks.length > 0).length;
    if (totalCarriedTasks === 0 && totalCarriedSections === 0 && carriedNotes.length === 0 && carriedMeetings.length === 0 && carriedEvents.length === 0) {
      alert("No incomplete tasks, meetings, or events to carry forward. All done!");
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
      events: remainingEvents,
    };
    const updatedNext = {
      ...existingNext,
      subTasks: newNextSubTasks,
      managerNotes: [...carriedNotes, ...(existingNext.managerNotes || [])],
      meetings: [...carriedMeetings, ...(existingNext.meetings || [])],
      events: [...carriedEvents, ...(existingNext.events || [])],
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
    const targetDate = m.date || state.currentDate;
    const targetDay = state.days[targetDate] || createDayData(targetDate);
    const newMeeting: Meeting = { ...m, date: targetDate, id: "meet_" + Date.now() };

    save({
      ...state,
      days: {
        ...state.days,
        [targetDate]: {
          ...targetDay,
          meetings: [...(targetDay.meetings || []), newMeeting],
        },
      },
    });
  };

  const deleteMeeting = (id: string) => {
    if (!window.confirm("Remove this meeting?")) return;

    const { isTaskMeeting, taskId, chipIdx } = parseMeetingId(id);
    const updatedDays = { ...state.days };
    updatedDays[state.currentDate] = { ...day };

    if (isTaskMeeting) {
      let found = false;
      for (const [dKey, dVal] of Object.entries(updatedDays)) {
        if (!dVal) continue;
        let dayModified = false;
        let newSubTasks = dVal.subTasks || [];
        let newNotes = dVal.managerNotes || [];

        if (newSubTasks.some((s) => s.id === taskId)) {
          newSubTasks = newSubTasks
            .map((s) => {
              if (s.id !== taskId) return s;
              if (chipIdx >= 0 && s.chips) {
                const nc = s.chips.filter((_, i) => i !== chipIdx);
                return { ...s, chips: nc, text: nc.map((c) => c.text).join(", ") };
              } else {
                return { ...s, text: "" };
              }
            })
            .filter((s) => {
              if (s.isSection) return true;
              if (s.chips && s.chips.length > 0) return true;
              return s.text.trim().length > 0;
            });
          dayModified = true;
        }

        if (newNotes.some((n) => n.id === taskId)) {
          newNotes = newNotes
            .map((n) => {
              if (n.id !== taskId) return n;
              if (chipIdx >= 0 && n.chips) {
                const nc = n.chips.filter((_, i) => i !== chipIdx);
                return { ...n, chips: nc, content: nc.map((c) => c.text).join(", ") };
              } else {
                return { ...n, content: "" };
              }
            })
            .filter((n) => {
              if (n.chips && n.chips.length > 0) return true;
              return n.content.trim().length > 0;
            });
          dayModified = true;
        }

        if (dayModified) {
          updatedDays[dKey] = {
            ...dVal,
            subTasks: newSubTasks,
            managerNotes: newNotes,
          };
          found = true;
        }
      }

      if (found) {
        save({ ...state, days: updatedDays });
      }
      return;
    }

    let found = false;
    for (const [dKey, dVal] of Object.entries(updatedDays)) {
      if (dVal.meetings && dVal.meetings.some((m) => m.id === id)) {
        updatedDays[dKey] = {
          ...dVal,
          meetings: dVal.meetings.filter((m) => m.id !== id),
        };
        found = true;
      }
    }
    if (found) {
      save({ ...state, days: updatedDays });
    }
  };

  const cycleMeetingStatus = (id: string) => {
    const { isTaskMeeting, taskId, chipIdx } = parseMeetingId(id);
    const updatedDays = { ...state.days };
    updatedDays[state.currentDate] = { ...day };

    if (isTaskMeeting) {
      let found = false;
      for (const [dKey, dVal] of Object.entries(updatedDays)) {
        if (!dVal) continue;
        let dayModified = false;
        let newSubTasks = dVal.subTasks || [];
        let newNotes = dVal.managerNotes || [];

        if (newSubTasks.some((s) => s.id === taskId)) {
          newSubTasks = newSubTasks.map((s) => {
            if (s.id !== taskId) return s;
            if (chipIdx >= 0 && s.chips && s.chips[chipIdx]) {
              const newChips = s.chips.map((c, i) => {
                if (i !== chipIdx) return c;
                const nextStatus = SCYCLE[(SCYCLE.indexOf(c.status) + 1) % 3];
                return { ...c, status: nextStatus };
              });
              return { ...s, chips: newChips };
            } else {
              return { ...s, status: SCYCLE[(SCYCLE.indexOf(s.status) + 1) % 3] };
            }
          });
          dayModified = true;
        }

        if (newNotes.some((n) => n.id === taskId)) {
          newNotes = newNotes.map((n) => {
            if (n.id !== taskId) return n;
            if (chipIdx >= 0 && n.chips && n.chips[chipIdx]) {
              const newChips = n.chips.map((c, i) => {
                if (i !== chipIdx) return c;
                const nextStatus = SCYCLE[(SCYCLE.indexOf(c.status) + 1) % 3];
                return { ...c, status: nextStatus };
              });
              const allDone = newChips.length > 0 && newChips.every((c) => c.status === "done");
              const anyDoing = newChips.some((c) => c.status === "doing" || c.status === "done");
              return { ...n, chips: newChips, status: (allDone ? "done" : anyDoing ? "doing" : "not_started") as Status };
            } else {
              return { ...n, status: SCYCLE[(SCYCLE.indexOf(n.status) + 1) % 3] };
            }
          });
          dayModified = true;
        }

        if (dayModified) {
          updatedDays[dKey] = {
            ...dVal,
            subTasks: newSubTasks,
            managerNotes: newNotes,
          };
          found = true;
        }
      }

      if (found) {
        save({ ...state, days: updatedDays });
      }
      return;
    }

    let found = false;
    for (const [dKey, dVal] of Object.entries(updatedDays)) {
      if (dVal.meetings && dVal.meetings.some((m) => m.id === id)) {
        updatedDays[dKey] = {
          ...dVal,
          meetings: dVal.meetings.map((meet) => {
            if (meet.id === id) {
              const idx = SCYCLE.indexOf(meet.status);
              const next = SCYCLE[(idx + 1) % 3];
              return { ...meet, status: next };
            }
            return meet;
          }),
        };
        found = true;
      }
    }
    if (found) {
      save({ ...state, days: updatedDays });
    }
  };

  const editMeeting = (id: string, updates: { projectId: string; time: string; date?: string }) => {
    const { isTaskMeeting, taskId, chipIdx } = parseMeetingId(id);
    const targetDate = updates.date || state.currentDate;
    const cleanProject = updates.projectId.replace(/\b(am|pm)\b/gi, "").trim() || "Meeting";
    const timeTag = updates.time ? (updates.time.startsWith("@") ? updates.time : `@${updates.time}`) : "@Meet";
    const newText = `${cleanProject} ${timeTag}`.trim();

    if (isTaskMeeting) {
      const updatedDays = { ...state.days };
      updatedDays[state.currentDate] = { ...day };

      let sourceDayKey = state.currentDate;
      let foundInSubTasks = false;
      let foundInNotes = false;

      // Find which day currently contains this task
      for (const [dKey, dVal] of Object.entries(updatedDays)) {
        if (!dVal) continue;
        if (dVal.subTasks && dVal.subTasks.some((s) => s.id === taskId)) {
          sourceDayKey = dKey;
          foundInSubTasks = true;
          break;
        }
        if (dVal.managerNotes && dVal.managerNotes.some((n) => n.id === taskId)) {
          sourceDayKey = dKey;
          foundInNotes = true;
          break;
        }
      }

      if (sourceDayKey === targetDate) {
        // Date did not change - update in place
        if (foundInSubTasks) {
          const sDay = updatedDays[sourceDayKey];
          updatedDays[sourceDayKey] = {
            ...sDay,
            subTasks: (sDay.subTasks || []).map((s) => {
              if (s.id !== taskId) return s;
              if (chipIdx >= 0 && s.chips && s.chips[chipIdx]) {
                const newChips = s.chips.map((c, i) => (i === chipIdx ? { ...c, text: newText } : c));
                return { ...s, chips: newChips, text: newChips.map((c) => c.text).join(", ") };
              }
              return { ...s, text: newText };
            }),
          };
        } else if (foundInNotes) {
          const sDay = updatedDays[sourceDayKey];
          updatedDays[sourceDayKey] = {
            ...sDay,
            managerNotes: (sDay.managerNotes || []).map((n) => {
              if (n.id !== taskId) return n;
              if (chipIdx >= 0 && n.chips && n.chips[chipIdx]) {
                const newChips = n.chips.map((c, i) => (i === chipIdx ? { ...c, text: newText } : c));
                return { ...n, chips: newChips, content: newChips.map((c) => c.text).join(", ") };
              }
              return { ...n, content: newText };
            }),
          };
        }
      } else {
        // Date CHANGED: Move the task/chip from sourceDayKey to targetDate
        const sDay = updatedDays[sourceDayKey] || createDayData(sourceDayKey);
        const tDay = updatedDays[targetDate] || createDayData(targetDate);

        if (foundInSubTasks && sDay.subTasks) {
          const sourceTask = sDay.subTasks.find((s) => s.id === taskId);
          if (sourceTask) {
            if (chipIdx >= 0 && sourceTask.chips && sourceTask.chips.length > 1) {
              // Task has multiple chips: remove just this chip from source day
              const movedChip = sourceTask.chips[chipIdx];
              const remainingChips = sourceTask.chips.filter((_, i) => i !== chipIdx);
              updatedDays[sourceDayKey] = {
                ...sDay,
                subTasks: sDay.subTasks.map((s) =>
                  s.id === taskId ? { ...s, chips: remainingChips, text: remainingChips.map((c) => c.text).join(", ") } : s
                ),
              };
              // Add new subtask row on targetDate for the moved chip
              const newSubTask: SubTask = {
                id: "st_" + Date.now(),
                text: newText,
                status: (movedChip.status || "not_started") as Status,
                parentId: sourceTask.parentId || "",
                chips: [{ text: newText, status: movedChip.status || "not_started" }],
                employee: sourceTask.employee || "@Meetings",
              };
              updatedDays[targetDate] = {
                ...tDay,
                subTasks: [...(tDay.subTasks || []), newSubTask],
              };
            } else {
              // Single chip or plain row: move entire subtask to targetDate
              updatedDays[sourceDayKey] = {
                ...sDay,
                subTasks: sDay.subTasks.filter((s) => s.id !== taskId),
              };
              const updatedSubTask: SubTask = {
                ...sourceTask,
                text: newText,
                chips: sourceTask.chips && sourceTask.chips.length > 0 ? [{ ...sourceTask.chips[0], text: newText }] : undefined,
              };
              updatedDays[targetDate] = {
                ...tDay,
                subTasks: [...(tDay.subTasks || []), updatedSubTask],
              };
            }
          }
        } else if (foundInNotes && sDay.managerNotes) {
          const sourceNote = sDay.managerNotes.find((n) => n.id === taskId);
          if (sourceNote) {
            updatedDays[sourceDayKey] = {
              ...sDay,
              managerNotes: sDay.managerNotes.filter((n) => n.id !== taskId),
            };
            const updatedNote: ManagerNote = {
              ...sourceNote,
              content: newText,
              chips: sourceNote.chips && sourceNote.chips.length > 0 ? [{ ...sourceNote.chips[0], text: newText }] : undefined,
            };
            updatedDays[targetDate] = {
              ...tDay,
              managerNotes: [...(tDay.managerNotes || []), updatedNote],
            };
          }
        }
      }

      save({ ...state, days: updatedDays });
      return;
    }

    const updatedDays = { ...state.days };
    let movingMeeting: Meeting | undefined;

    for (const [dKey, dVal] of Object.entries(updatedDays)) {
      if (dVal.meetings && dVal.meetings.some((m) => m.id === id)) {
        movingMeeting = dVal.meetings.find((m) => m.id === id);
        updatedDays[dKey] = {
          ...dVal,
          meetings: dVal.meetings.filter((m) => m.id !== id),
        };
      }
    }

    const targetDay = updatedDays[targetDate] || createDayData(targetDate);
    const updatedMeeting: Meeting = movingMeeting
      ? { ...movingMeeting, projectId: cleanProject, time: updates.time, date: targetDate }
      : { id, projectId: cleanProject, time: updates.time, date: targetDate, employeeIds: [], status: "not_started" as Status };

    updatedDays[targetDate] = {
      ...targetDay,
      meetings: [...(targetDay.meetings || []), updatedMeeting],
    };

    save({
      ...state,
      days: updatedDays,
    });
  };

  const addEvent = (e: Omit<EventItem, "id">) => {
    const targetDate = e.date || state.currentDate;
    const targetDay = state.days[targetDate] || createDayData(targetDate);
    const recurringDay = new Date(targetDate + "T12:00:00").getDay();
    const newEvent: EventItem = {
      ...e,
      date: targetDate,
      recurrence: e.recurrence || "one_time",
      recurringDay: e.recurrence === "weekly" ? recurringDay : undefined,
      id: "event_" + Date.now(),
    };

    const updatedState = { ...state };
    if (e.recurrence === "weekly") {
      updatedState.recurringEvents = [...(updatedState.recurringEvents || []), newEvent];
    }
    updatedState.days = {
      ...updatedState.days,
      [targetDate]: {
        ...targetDay,
        events: [...(targetDay.events || []), newEvent],
      },
    };
    save(updatedState);
  };

  const deleteEvent = (id: string) => {
    if (!window.confirm("Remove this event?")) return;

    const { isTaskEvent, taskId, chipIdx } = parseEventId(id);
    const updatedDays = { ...state.days };
    updatedDays[state.currentDate] = { ...day };

    if (isTaskEvent) {
      let found = false;
      for (const [dKey, dVal] of Object.entries(updatedDays)) {
        if (!dVal) continue;
        let dayModified = false;
        let newSubTasks = dVal.subTasks || [];
        let newNotes = dVal.managerNotes || [];

        if (newSubTasks.some((s) => s.id === taskId)) {
          newSubTasks = newSubTasks
            .map((s) => {
              if (s.id !== taskId) return s;
              if (chipIdx >= 0 && s.chips) {
                const nc = s.chips.filter((_, i) => i !== chipIdx);
                return { ...s, chips: nc, text: nc.map((c) => c.text).join(", ") };
              } else {
                return { ...s, text: "" };
              }
            })
            .filter((s) => {
              if (s.isSection) return true;
              if (s.chips && s.chips.length > 0) return true;
              return s.text.trim().length > 0;
            });
          dayModified = true;
        }

        if (newNotes.some((n) => n.id === taskId)) {
          newNotes = newNotes
            .map((n) => {
              if (n.id !== taskId) return n;
              if (chipIdx >= 0 && n.chips) {
                const nc = n.chips.filter((_, i) => i !== chipIdx);
                return { ...n, chips: nc, content: nc.map((c) => c.text).join(", ") };
              } else {
                return { ...n, content: "" };
              }
            })
            .filter((n) => {
              if (n.chips && n.chips.length > 0) return true;
              return n.content.trim().length > 0;
            });
          dayModified = true;
        }

        if (dayModified) {
          updatedDays[dKey] = {
            ...dVal,
            subTasks: newSubTasks,
            managerNotes: newNotes,
          };
          found = true;
        }
      }

      if (found) {
        save({ ...state, days: updatedDays });
      }
      return;
    }

    const origRecId = id.startsWith("rec_") ? id.slice("rec_".length) : id;
    for (const [dKey, dVal] of Object.entries(updatedDays)) {
      if (dVal.events && dVal.events.some((e) => e.id === id || e.id === origRecId)) {
        updatedDays[dKey] = {
          ...dVal,
          events: dVal.events.filter((evt) => evt.id !== id && evt.id !== origRecId),
        };
      }
    }
    save({
      ...state,
      recurringEvents: (state.recurringEvents || []).filter((r) => r.id !== origRecId && r.id !== id),
      days: updatedDays,
    });
  };

  const cycleEventStatus = (id: string) => {
    const { isTaskEvent, taskId, chipIdx } = parseEventId(id);
    const updatedDays = { ...state.days };
    updatedDays[state.currentDate] = { ...day };

    if (isTaskEvent) {
      let found = false;
      for (const [dKey, dVal] of Object.entries(updatedDays)) {
        if (!dVal) continue;
        let dayModified = false;
        let newSubTasks = dVal.subTasks || [];
        let newNotes = dVal.managerNotes || [];

        if (newSubTasks.some((s) => s.id === taskId)) {
          newSubTasks = newSubTasks.map((s) => {
            if (s.id !== taskId) return s;
            if (chipIdx >= 0 && s.chips && s.chips[chipIdx]) {
              const newChips = s.chips.map((c, i) => {
                if (i !== chipIdx) return c;
                const nextStatus = SCYCLE[(SCYCLE.indexOf(c.status) + 1) % 3];
                return { ...c, status: nextStatus };
              });
              return { ...s, chips: newChips };
            } else {
              return { ...s, status: SCYCLE[(SCYCLE.indexOf(s.status) + 1) % 3] };
            }
          });
          dayModified = true;
        }

        if (newNotes.some((n) => n.id === taskId)) {
          newNotes = newNotes.map((n) => {
            if (n.id !== taskId) return n;
            if (chipIdx >= 0 && n.chips && n.chips[chipIdx]) {
              const newChips = n.chips.map((c, i) => {
                if (i !== chipIdx) return c;
                const nextStatus = SCYCLE[(SCYCLE.indexOf(c.status) + 1) % 3];
                return { ...c, status: nextStatus };
              });
              const allDone = newChips.length > 0 && newChips.every((c) => c.status === "done");
              const anyDoing = newChips.some((c) => c.status === "doing" || c.status === "done");
              return { ...n, chips: newChips, status: (allDone ? "done" : anyDoing ? "doing" : "not_started") as Status };
            } else {
              return { ...n, status: SCYCLE[(SCYCLE.indexOf(n.status) + 1) % 3] };
            }
          });
          dayModified = true;
        }

        if (dayModified) {
          updatedDays[dKey] = {
            ...dVal,
            subTasks: newSubTasks,
            managerNotes: newNotes,
          };
          found = true;
        }
      }

      if (found) {
        save({ ...state, days: updatedDays });
      }
      return;
    }

    const origRecId = id.startsWith("rec_") ? id.slice("rec_".length) : id;
    let found = false;

    for (const [dKey, dVal] of Object.entries(updatedDays)) {
      if (dVal.events && dVal.events.some((e) => e.id === id || e.id === origRecId)) {
        updatedDays[dKey] = {
          ...dVal,
          events: dVal.events.map((evt) => {
            if (evt.id === id || evt.id === origRecId) {
              const idx = SCYCLE.indexOf(evt.status);
              const next = SCYCLE[(idx + 1) % 3];
              return { ...evt, status: next };
            }
            return evt;
          }),
        };
        found = true;
      }
    }

    const updatedRec = (state.recurringEvents || []).map((r) => {
      if (r.id === origRecId || r.id === id) {
        const idx = SCYCLE.indexOf(r.status);
        return { ...r, status: SCYCLE[(idx + 1) % 3] };
      }
      return r;
    });

    save({
      ...state,
      recurringEvents: updatedRec,
      days: updatedDays,
    });
  };

  const editEvent = (
    id: string,
    updates: {
      title: string;
      category: EventCategory;
      time?: string;
      location?: string;
      date?: string;
      recurrence?: EventRecurrence;
    }
  ) => {
    const { isTaskEvent, taskId, chipIdx } = parseEventId(id);

    if (isTaskEvent) {
      const updatedDays = { ...state.days };
      updatedDays[state.currentDate] = { ...day };
      let found = false;

      for (const [dKey, dVal] of Object.entries(updatedDays)) {
        if (!dVal) continue;
        let dayModified = false;
        let newSubTasks = dVal.subTasks || [];
        let newNotes = dVal.managerNotes || [];

        if (newSubTasks.some((s) => s.id === taskId)) {
          const newText = updates.title.trim();
          newSubTasks = newSubTasks.map((s) => {
            if (s.id !== taskId) return s;
            if (chipIdx >= 0 && s.chips && s.chips[chipIdx]) {
              const newChips = s.chips.map((c, i) =>
                i === chipIdx ? { ...c, text: newText } : c
              );
              return { ...s, chips: newChips, text: newChips.map((c) => c.text).join(", ") };
            } else {
              return { ...s, text: newText };
            }
          });
          dayModified = true;
        }

        if (newNotes.some((n) => n.id === taskId)) {
          const newText = updates.title.trim();
          newNotes = newNotes.map((n) => {
            if (n.id !== taskId) return n;
            if (chipIdx >= 0 && n.chips && n.chips[chipIdx]) {
              const newChips = n.chips.map((c, i) =>
                i === chipIdx ? { ...c, text: newText } : c
              );
              return { ...n, chips: newChips, content: newChips.map((c) => c.text).join(", ") };
            } else {
              return { ...n, content: newText };
            }
          });
          dayModified = true;
        }

        if (dayModified) {
          updatedDays[dKey] = {
            ...dVal,
            subTasks: newSubTasks,
            managerNotes: newNotes,
          };
          found = true;
        }
      }

      if (found) {
        save({ ...state, days: updatedDays });
      }
      return;
    }

    const origRecId = id.startsWith("rec_") ? id.slice("rec_".length) : id;
    const targetDate = updates.date || state.currentDate;
    const recurringDay = new Date(targetDate + "T12:00:00").getDay();

    const updatedState = { ...state };
    const updatedDays = { ...updatedState.days };

    // Update in recurringEvents if applicable
    if (updates.recurrence === "weekly") {
      const existingIdx = (updatedState.recurringEvents || []).findIndex((r) => r.id === origRecId || r.id === id);
      const updatedTemplate: EventItem = {
        id: origRecId,
        title: updates.title,
        category: updates.category,
        time: updates.time,
        location: updates.location,
        date: targetDate,
        recurrence: "weekly",
        recurringDay,
        status: "not_started",
      };
      if (existingIdx >= 0) {
        updatedState.recurringEvents = (updatedState.recurringEvents || []).map((r, i) =>
          i === existingIdx ? updatedTemplate : r
        );
      } else {
        updatedState.recurringEvents = [...(updatedState.recurringEvents || []), updatedTemplate];
      }
    } else {
      updatedState.recurringEvents = (updatedState.recurringEvents || []).filter((r) => r.id !== origRecId && r.id !== id);
    }

    // Find and update event in whichever day it currently lives, moving to targetDate if needed
    let movingEvent: EventItem | undefined;
    for (const [dKey, dVal] of Object.entries(updatedDays)) {
      if (dVal.events && dVal.events.some((e) => e.id === id || e.id === origRecId)) {
        movingEvent = dVal.events.find((e) => e.id === id || e.id === origRecId);
        updatedDays[dKey] = {
          ...dVal,
          events: dVal.events.filter((e) => e.id !== id && e.id !== origRecId),
        };
      }
    }

    const targetDay = updatedDays[targetDate] || createDayData(targetDate);
    const updatedEventItem: EventItem = {
      ...(movingEvent || {}),
      id: origRecId,
      title: updates.title,
      category: updates.category,
      time: updates.time,
      location: updates.location,
      date: targetDate,
      recurrence: updates.recurrence || "one_time",
      recurringDay: updates.recurrence === "weekly" ? recurringDay : undefined,
      status: movingEvent ? movingEvent.status : "not_started",
    };

    updatedDays[targetDate] = {
      ...targetDay,
      events: [...(targetDay.events || []), updatedEventItem],
    };

    updatedState.days = updatedDays;
    save(updatedState);
  };

  // cycleMain changes status (sleep/workout streak tracking) — recalc streaks here
  const cycleMain = (id: string) => {
    const updated = { ...state, days: { ...state.days, [state.currentDate]: { ...day, mainTasks: day.mainTasks.map((t) => t.id === id ? { ...t, status: SCYCLE[(SCYCLE.indexOf(t.status) + 1) % 3] } : t) } } };
    save(updated, true); // withStreaks=true only on status cycle
  };
  const setMainName = (id: string, name: string) => setDay((d) => ({ ...d, mainTasks: d.mainTasks.map((t) => t.id === id ? { ...t, name } : t) }));
  const setTime = (id: string, f: "from" | "to", v: string) => setDay((d) => ({ ...d, mainTasks: d.mainTasks.map((t) => t.id === id ? { ...t, [f]: v } : t) }));
  const setGoalLink = (id: string, goalId: string) => setDay((d) => ({ ...d, mainTasks: d.mainTasks.map((t) => t.id === id ? { ...t, goalLink: goalId } : t) }));
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

  const grouped = day.mainTasks.reduce((a, t) => { (a[t.category] ??= []).push(t); return a; }, {} as Record<string, MainTask[]>);

  // ─── Styles ───
  const sidebar: React.CSSProperties = { width: 240, flexShrink: 0, display: "flex", flexDirection: "column", padding: 24, background: "#fff", borderRight: "1px solid #F0EEEC", height: "100vh", position: "sticky", top: 0 };
  const navBtn = (active: boolean): React.CSSProperties => ({ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: active ? "#EFF6FF" : "transparent", color: active ? "#2563EB" : "#78716C", transition: "all 0.15s", textAlign: "left" });
  const card: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #F0EEEC", boxShadow: "0 1px 2px rgba(28,25,23,0.04)" };
  const gridCols = "130px 1fr 220px 30px";
  const inp: React.CSSProperties = { fontSize: 12, padding: "5px 8px", borderRadius: 8, background: "#FAFAF9", border: "1px solid #E7E5E4", color: "#1C1917", boxSizing: "border-box", outline: "none" };

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
              ["history", Archive, "History"],
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
                {userName[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{userName}</div>
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
                        {greeting()}, {userName}
                      </h1>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => go(-1)} style={{ padding: 2, cursor: "pointer" }}><ChevronLeft size={16} color="#A8A29E" /></button>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#78716C" }}>{fmtDate(state.currentDate)}</span>
                        {isToday && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#EFF6FF", color: "#2563EB" }}>Today</span>}
                        <button onClick={() => go(1)} style={{ padding: 2, cursor: "pointer" }}><ChevronRight size={16} color="#A8A29E" /></button>
                      </div>
                    </div>
                    {/* Day rating */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Rate this day</span>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} onClick={() => rate(day.rating === n ? 0 : n)} title={`Rate ${n}/5`} style={{ padding: 1, cursor: "pointer" }}>
                            <Star size={16} color={n <= day.rating ? "#F59E0B" : "#E7E5E4"} fill={n <= day.rating ? "#F59E0B" : "none"} />
                          </button>
                        ))}
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
                                          {/* Streak badge — Sleep/Workout only */}
                                          {(task.id === "sleep" || task.id === "workout") && (state.streaks?.[task.id] ?? 0) > 0 && (
                                            <span title={`${state.streaks[task.id]}-day streak`} style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: "#FFF7ED", color: "#EA580C" }}>
                                              <Flame size={11} /> {state.streaks[task.id]}
                                            </span>
                                          )}
                                          {/* Goal link picker */}
                                          {state.goals.length > 0 && (() => {
                                            const linked = state.goals.find((g) => g.id === task.goalLink);
                                            return (
                                              <select
                                                value={task.goalLink || ""}
                                                onChange={(e) => setGoalLink(task.id, e.target.value)}
                                                title="Link this task to a goal"
                                                style={{
                                                  flexShrink: 0, fontSize: 10, fontWeight: 600, padding: "2px 4px", borderRadius: 6,
                                                  border: "1px solid " + (linked ? linked.color + "60" : "#E7E5E4"),
                                                  background: linked ? linked.color + "15" : "#FAFAF9",
                                                  color: linked ? linked.color : "#A8A29E",
                                                  maxWidth: 92, cursor: "pointer"
                                                }}
                                              >
                                                <option value="">No goal</option>
                                                {state.goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                                              </select>
                                            );
                                          })()}
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
                    pendingMeetingsCount={
                      (day.meetings || []).filter((m) => m.status !== "done").length +
                      (day.events || []).filter((e) => e.status !== "done").length
                    }
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
                        const newChips = s.chips.map((c, i) => {
                          if (i !== chipIdx) return c;
                          const curStatus: Status = c.status || "not_started";
                          const nextStatus: Status = SCYCLE[(SCYCLE.indexOf(curStatus) + 1) % 3];
                          return { ...c, status: nextStatus };
                        });
                        return { ...s, chips: newChips };
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
                        const newChips = n.chips.map((c, i) => {
                          if (i !== chipIdx) return c;
                          const curStatus: Status = c.status || "not_started";
                          const nextStatus: Status = SCYCLE[(SCYCLE.indexOf(curStatus) + 1) % 3];
                          return { ...c, status: nextStatus };
                        });
                        return { ...n, chips: newChips };
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
                    onAddChipToRow={(id, list, chip) => {
                      if (list === "daily") {
                        setDay((d) => ({
                          ...d, subTasks: d.subTasks.map((s) => {
                            if (s.id !== id) return s;
                            const nc = [...(s.chips || []), chip];
                            return { ...s, chips: nc, text: nc.map((c) => c.text).join(", ") };
                          })
                        }));
                      } else {
                        setDay((d) => ({
                          ...d, managerNotes: d.managerNotes.map((n) => {
                            if (n.id !== id) return n;
                            const nc = [...(n.chips || []), chip];
                            return { ...n, chips: nc, content: nc.map((c) => c.text).join(", ") };
                          })
                        }));
                      }
                    }}
                    onToggleSubtask={(id, list, chipIdx, subtaskIdx) => {
                      const updateChips = (chips: TaskChip[]) => {
                        return chips.map((c, i) => {
                          if (i !== chipIdx || !c.subtasks) return c;
                          const newSubtasks = c.subtasks.map((st, si) => {
                            if (si !== subtaskIdx) return st;
                            const curStatus: Status = st.status || "not_started";
                            const nextStatus: Status = SCYCLE[(SCYCLE.indexOf(curStatus) + 1) % 3];
                            return { ...st, status: nextStatus };
                          });
                          return { ...c, subtasks: newSubtasks };
                        });
                      };
                      if (list === "daily") {
                        setDay((d) => ({
                          ...d,
                          subTasks: d.subTasks.map((s) => (s.id === id && s.chips ? { ...s, chips: updateChips(s.chips) } : s)),
                        }));
                      } else {
                        setDay((d) => ({
                          ...d,
                          managerNotes: d.managerNotes.map((n) => (n.id === id && n.chips ? { ...n, chips: updateChips(n.chips) } : n)),
                        }));
                      }
                    }}
                    onAddSubtaskToChip={(id, list, chipIdx, text) => {
                      if (!text.trim()) return;
                      const updateChips = (chips: TaskChip[]) => {
                        return chips.map((c, i) => {
                          if (i !== chipIdx) return c;
                          const currentSubtasks = c.subtasks || [];
                          const newSubtasks = [
                            ...currentSubtasks,
                            {
                              id: "st_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
                              text: text.trim(),
                              status: "not_started" as Status,
                            },
                          ];
                          return { ...c, subtasks: newSubtasks };
                        });
                      };
                      if (list === "daily") {
                        setDay((d) => ({
                          ...d,
                          subTasks: d.subTasks.map((s) => (s.id === id && s.chips ? { ...s, chips: updateChips(s.chips) } : s)),
                        }));
                      } else {
                        setDay((d) => ({
                          ...d,
                          managerNotes: d.managerNotes.map((n) => (n.id === id && n.chips ? { ...n, chips: updateChips(n.chips) } : n)),
                        }));
                      }
                    }}
                    onEditSubtask={(id, list, chipIdx, subtaskIdx, newText) => {
                      const updateChips = (chips: TaskChip[]) => {
                        return chips.map((c, i) => {
                          if (i !== chipIdx || !c.subtasks) return c;
                          const newSubtasks = c.subtasks.map((st, si) => (si === subtaskIdx ? { ...st, text: newText } : st));
                          return { ...c, subtasks: newSubtasks };
                        });
                      };
                      if (list === "daily") {
                        setDay((d) => ({
                          ...d,
                          subTasks: d.subTasks.map((s) => (s.id === id && s.chips ? { ...s, chips: updateChips(s.chips) } : s)),
                        }));
                      } else {
                        setDay((d) => ({
                          ...d,
                          managerNotes: d.managerNotes.map((n) => (n.id === id && n.chips ? { ...n, chips: updateChips(n.chips) } : n)),
                        }));
                      }
                    }}
                    onDeleteSubtask={(id, list, chipIdx, subtaskIdx) => {
                      const updateChips = (chips: TaskChip[]) => {
                        return chips.map((c, i) => {
                          if (i !== chipIdx || !c.subtasks) return c;
                          const newSubtasks = c.subtasks.filter((_, si) => si !== subtaskIdx);
                          return {
                            ...c,
                            subtasks: newSubtasks.length > 0 ? newSubtasks : undefined,
                          };
                        });
                      };
                      if (list === "daily") {
                        setDay((d) => ({
                          ...d,
                          subTasks: d.subTasks.map((s) => (s.id === id && s.chips ? { ...s, chips: updateChips(s.chips) } : s)),
                        }));
                      } else {
                        setDay((d) => ({
                          ...d,
                          managerNotes: d.managerNotes.map((n) => (n.id === id && n.chips ? { ...n, chips: updateChips(n.chips) } : n)),
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

            {/* ═══ RIGHT SIDEBAR (Meetings & Events Tracker) ═══ */}
            <div style={{ width: 320, flexShrink: 0, padding: "28px 32px 28px 0", display: tab === "tasks" ? "block" : "none" }}>
                <div style={{ position: "sticky", top: 28, display: "flex", flexDirection: "column", gap: 28 }}>

                  {/* Employee Tasks Overview Section */}
                  <EmployeeTasksSection
                    employees={state.employees || []}
                    subTasks={day.subTasks || []}
                    managerNotes={day.managerNotes || []}
                    cardStyle={card}
                  />

                  {/* Two Main Categories: Meetings & Events (Ours | Imp) */}
                  {(() => {
                    const meetingMap = new Map<string, Meeting>();

                    // 1. Scan all days for task meetings & direct meetings
                    for (const [dKey, dVal] of Object.entries(state.days || {})) {
                      if (!dVal) continue;
                      const dTaskMeetings = extractMeetingsFromTasks(dVal.subTasks || [], dVal.managerNotes || []);
                      dTaskMeetings.forEach((item) => {
                        if (dKey >= state.currentDate || item.meeting.status !== "done") {
                          meetingMap.set(item.meeting.id, { ...item.meeting, date: item.meeting.date || dKey });
                        }
                      });
                      (dVal.meetings || []).forEach((m) => {
                        if (dKey >= state.currentDate || m.status !== "done") {
                          meetingMap.set(m.id, { ...m, date: m.date || dKey });
                        }
                      });
                    }

                    // 2. Merge current active in-memory day
                    const curTaskMeetings = extractMeetingsFromTasks(day.subTasks || [], day.managerNotes || []);
                    curTaskMeetings.forEach((item) => {
                      meetingMap.set(item.meeting.id, { ...item.meeting, date: item.meeting.date || state.currentDate });
                    });
                    (day.meetings || []).forEach((m) => {
                      meetingMap.set(m.id, { ...m, date: m.date || state.currentDate });
                    });

                    const allMeetings = Array.from(meetingMap.values()).sort((a, b) => {
                      const dateA = a.date || state.currentDate;
                      const dateB = b.date || state.currentDate;
                      if (dateA !== dateB) return dateA.localeCompare(dateB);
                      const timeA = parseTimeToMinutes(a.time);
                      const timeB = parseTimeToMinutes(b.time);
                      if (timeA !== timeB) return timeA - timeB;
                      return (a.projectId || "").localeCompare(b.projectId || "");
                    });

                    const eventMap = new Map<string, EventItem>();

                    // 1. Scan all days for task events & direct events
                    for (const [dKey, dVal] of Object.entries(state.days || {})) {
                      if (!dVal) continue;
                      const dTaskEvents = extractEventsFromTasks(dVal.subTasks || [], dVal.managerNotes || []);
                      dTaskEvents.forEach((item) => {
                        if (dKey >= state.currentDate || item.event.status !== "done") {
                          eventMap.set(item.event.id, { ...item.event, date: item.event.date || dKey });
                        }
                      });
                      (dVal.events || []).forEach((evt) => {
                        if (dKey >= state.currentDate || evt.status !== "done") {
                          eventMap.set(evt.id, { ...evt, date: evt.date || dKey });
                        }
                      });
                    }

                    // 2. Merge current active in-memory day
                    const curTaskEvents = extractEventsFromTasks(day.subTasks || [], day.managerNotes || []);
                    curTaskEvents.forEach((item) => {
                      eventMap.set(item.event.id, { ...item.event, date: item.event.date || state.currentDate });
                    });
                    (day.events || []).forEach((evt) => {
                      eventMap.set(evt.id, { ...evt, date: evt.date || state.currentDate });
                    });

                    // 4. All recurring events from library
                    (state.recurringEvents || []).forEach((re) => {
                      const alreadyInMap = Array.from(eventMap.values()).some(
                        (e) => e.id === re.id || e.id === `rec_${re.id}` || (e.title === re.title && e.category === re.category)
                      );
                      if (!alreadyInMap) {
                        eventMap.set(`rec_${re.id}`, {
                          ...re,
                          id: `rec_${re.id}`,
                          date: re.date || state.currentDate,
                          status: "not_started" as Status,
                        });
                      }
                    });

                    const allEvents = Array.from(eventMap.values()).sort((a, b) => {
                      const isRecA = a.recurrence === "weekly" ? 1 : 0;
                      const isRecB = b.recurrence === "weekly" ? 1 : 0;
                      if (isRecA !== isRecB) return isRecB - isRecA; // recurring events on top

                      if (isRecA && isRecB) {
                        const dayA = typeof a.recurringDay === "number" ? a.recurringDay : (a.date ? new Date(a.date + "T12:00:00").getDay() : 0);
                        const dayB = typeof b.recurringDay === "number" ? b.recurringDay : (b.date ? new Date(b.date + "T12:00:00").getDay() : 0);
                        if (dayA !== dayB) return dayA - dayB;
                        const timeA = parseTimeToMinutes(a.time);
                        const timeB = parseTimeToMinutes(b.time);
                        if (timeA !== timeB) return timeA - timeB;
                        return (a.title || "").localeCompare(b.title || "");
                      }

                      const dateA = a.date || state.currentDate;
                      const dateB = b.date || state.currentDate;
                      if (dateA !== dateB) return dateA.localeCompare(dateB);
                      const timeA = parseTimeToMinutes(a.time);
                      const timeB = parseTimeToMinutes(b.time);
                      if (timeA !== timeB) return timeA - timeB;
                      return (a.title || "").localeCompare(b.title || "");
                    });
                    return (
                      <MeetingsAndEventsSection
                        currentDate={state.currentDate}
                        meetings={allMeetings}
                        events={allEvents}
                        projects={state.projects || []}
                        employees={state.employees || []}
                        cardStyle={card}
                        inputStyle={inp}
                        onAddMeeting={addMeeting}
                        onDeleteMeeting={deleteMeeting}
                        onCycleMeetingStatus={cycleMeetingStatus}
                        onEditMeeting={editMeeting}
                        onAddEvent={addEvent}
                        onDeleteEvent={deleteEvent}
                        onCycleEventStatus={cycleEventStatus}
                        onEditEvent={editEvent}
                      />
                    );
                  })()}

                  {/* ─── GOAL SECTION (Displayed directly after Tracker) ─── */}
                  <GoalsOverviewSection
                    goals={state.goals || []}
                    cardStyle={card}
                    inputStyle={inp}
                    draggedGoal={draggedGoal}
                    setDraggedGoal={setDraggedGoal}
                    onNavigateToGoals={() => setTab("goals")}
                    onAddGoal={(g) => {
                      const newG: Goal = { ...g, id: "g_" + Date.now() };
                      save({ ...state, goals: [...(state.goals || []), newG] });
                    }}
                    onUpdateGoal={(id, updates) => {
                      save({
                        ...state,
                        goals: (state.goals || []).map((g) => (g.id === id ? { ...g, ...updates } : g)),
                      });
                    }}
                    onDeleteGoal={(id) => {
                      save({
                        ...state,
                        goals: (state.goals || []).filter((g) => g.id !== id),
                      });
                    }}
                    onReorderGoals={(newGoals) => {
                      save({ ...state, goals: newGoals });
                    }}
                  />

                </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Meetings & Events Tracker Section Component ─── */
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_OF_WEEK_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayName(dStr?: string) {
  if (!dStr) return "";
  try {
    const d = new Date(dStr + "T12:00:00");
    return isNaN(d.getTime()) ? "" : DAYS_OF_WEEK[d.getDay()];
  } catch {
    return "";
  }
}

function getDayShort(dStr?: string) {
  if (!dStr) return "";
  try {
    const d = new Date(dStr + "T12:00:00");
    return isNaN(d.getTime()) ? "" : DAYS_OF_WEEK_SHORT[d.getDay()];
  } catch {
    return "";
  }
}

function getRecurringDayLabel(evt: EventItem) {
  let dayShort = "";
  if (typeof evt.recurringDay === "number" && evt.recurringDay >= 0 && evt.recurringDay < 7) {
    dayShort = DAYS_OF_WEEK_SHORT[evt.recurringDay];
  } else if (evt.date) {
    dayShort = getDayShort(evt.date);
  }
  return dayShort ? `${dayShort} (Re-Occuring)` : "Re-Occuring";
}

function formatDateDisplay(dStr?: string) {
  if (!dStr) return "";
  try {
    const d = new Date(dStr + "T12:00:00");
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dStr;
  }
}

/* ─── Meetings & Events Tracker Section Component ─── */
interface MeetingsAndEventsSectionProps {
  currentDate: string;
  meetings: Meeting[];
  events: EventItem[];
  projects: Project[];
  employees: Employee[];
  cardStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  onAddMeeting: (m: Omit<Meeting, "id">) => void;
  onDeleteMeeting: (id: string) => void;
  onCycleMeetingStatus: (id: string) => void;
  onEditMeeting?: (id: string, updates: { projectId: string; time: string; date?: string }) => void;
  onAddEvent: (e: Omit<EventItem, "id">) => void;
  onDeleteEvent: (id: string) => void;
  onCycleEventStatus: (id: string) => void;
  onEditEvent?: (id: string, updates: { title: string; category: EventCategory; time?: string; location?: string; date?: string; recurrence?: EventRecurrence }) => void;
}

function MeetingsAndEventsSection({
  currentDate,
  meetings,
  events,
  projects,
  employees,
  cardStyle,
  inputStyle,
  onAddMeeting,
  onDeleteMeeting,
  onCycleMeetingStatus,
  onEditMeeting,
  onAddEvent,
  onDeleteEvent,
  onCycleEventStatus,
  onEditEvent,
}: MeetingsAndEventsSectionProps) {
  // Tracker collapse toggle state
  const [trackerOpen, setTrackerOpen] = useState(true);

  // Date scope filter ("today", "upcoming" for today + after, "archived" for past uncompleted, "all")
  const [dateScope, setDateScope] = useState<"today" | "upcoming" | "archived" | "all">("today");

  // Accordion dropdown states
  const [meetingsOpen, setMeetingsOpen] = useState(true);
  const [eventsOpen, setEventsOpen] = useState(true);

  // Filter dropdowns
  const [meetingFilter, setMeetingFilter] = useState<"all" | "pending" | "done" | "archived">("all");
  const [eventFilter, setEventFilter] = useState<"all" | "ours" | "others" | "imp" | "recurring" | "archived">("all");

  // ── Meetings Form State ──
  const [showAddMeetingForm, setShowAddMeetingForm] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editMeetingTitle, setEditMeetingTitle] = useState("");
  const [editMeetingTime, setEditMeetingTime] = useState("");
  const [editMeetingDate, setEditMeetingDate] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [customProjectName, setCustomProjectName] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [customEmployeeNames, setCustomEmployeeNames] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingDate, setMeetingDate] = useState(currentDate);
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const empDropRef = useRef<HTMLDivElement>(null);

  // Sync date when currentDate changes
  useEffect(() => {
    setMeetingDate(currentDate);
    setEventDate(currentDate);
  }, [currentDate]);

  // ── Events Form State ──
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventCategory, setEventCategory] = useState<EventCategory>("Ours");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDate, setEventDate] = useState(currentDate);
  const [eventRecurrence, setEventRecurrence] = useState<EventRecurrence>("one_time");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventTitle, setEditEventTitle] = useState("");
  const [editEventCategory, setEditEventCategory] = useState<EventCategory>("Ours");
  const [editEventTime, setEditEventTime] = useState("");
  const [editEventLocation, setEditEventLocation] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editEventRecurrence, setEditEventRecurrence] = useState<EventRecurrence>("one_time");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (empDropRef.current && !empDropRef.current.contains(event.target as Node)) {
        setShowEmpDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddMeeting = () => {
    let proj = selectedProjectId;
    if (proj === "custom") {
      proj = customProjectName.trim();
    } else {
      const found = projects.find((p) => p.id === selectedProjectId);
      proj = found ? found.name : selectedProjectId;
    }

    if (!proj) {
      alert("Please select or enter a project.");
      return;
    }

    const emps: string[] = [];
    selectedEmployeeIds.forEach((id) => {
      const found = employees.find((e) => e.id === id);
      if (found) emps.push(found.name);
    });

    if (customEmployeeNames.trim()) {
      customEmployeeNames.split(",").forEach((name) => {
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

    const targetDate = meetingDate || currentDate;
    onAddMeeting({
      projectId: proj,
      employeeIds: emps,
      time: meetingTime.trim(),
      date: targetDate,
      status: "not_started",
    });

    setMeetingsOpen(true);
    if (targetDate < currentDate) {
      setDateScope("all");
    } else {
      setDateScope("upcoming");
    }

    setSelectedProjectId("");
    setCustomProjectName("");
    setSelectedEmployeeIds([]);
    setCustomEmployeeNames("");
    setMeetingTime("");
    setMeetingDate(currentDate);
    setShowAddMeetingForm(false);
  };

  const handleAddEvent = () => {
    if (!eventTitle.trim()) {
      alert("Please enter an event title.");
      return;
    }

    const targetDate = eventDate || currentDate;
    onAddEvent({
      title: eventTitle.trim(),
      category: eventCategory,
      time: eventTime.trim() || undefined,
      location: eventLocation.trim() || undefined,
      date: targetDate,
      recurrence: eventRecurrence,
      status: "not_started",
    });

    setEventsOpen(true);
    if (targetDate < currentDate) {
      setDateScope("all");
    } else {
      setDateScope("upcoming");
    }

    setEventTitle("");
    setEventCategory("Ours");
    setEventTime("");
    setEventLocation("");
    setEventDate(currentDate);
    setEventRecurrence("one_time");
    setShowAddEventForm(false);
  };

  const handleSaveEditMeeting = (id: string) => {
    if (!editMeetingTitle.trim()) return;
    onEditMeeting?.(id, {
      projectId: editMeetingTitle.trim(),
      time: editMeetingTime.trim(),
      date: editMeetingDate || currentDate,
    });
    setEditingMeetingId(null);
  };

  const handleSaveEditEvent = (id: string) => {
    if (!editEventTitle.trim()) return;
    onEditEvent?.(id, {
      title: editEventTitle.trim(),
      category: editEventCategory,
      time: editEventTime.trim() || undefined,
      location: editEventLocation.trim() || undefined,
      date: editEventDate || currentDate,
      recurrence: editEventRecurrence,
    });
    setEditingEventId(null);
  };

  const getProjectColor = (projName: string) => {
    const found = projects.find((p) => p.name === projName);
    return found ? found.color : "#6B7280";
  };

  const initials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
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

  const currentDayOfWeek = new Date(currentDate + "T12:00:00").getDay();

  const isTodayMeeting = (m: Meeting) => {
    return (m.date || currentDate) === currentDate;
  };

  const isTodayEvent = (e: EventItem) => {
    if (e.recurrence === "weekly") {
      if (typeof e.recurringDay === "number") return e.recurringDay === currentDayOfWeek;
      if (e.date) return new Date(e.date + "T12:00:00").getDay() === currentDayOfWeek;
      return true;
    }
    return (e.date || currentDate) === currentDate;
  };

  const isUpcomingMeeting = (m: Meeting) => {
    if (!m.date) return true;
    return m.date >= currentDate;
  };

  const isUpcomingEvent = (e: EventItem) => {
    if (e.recurrence === "weekly") return true;
    if (!e.date) return true;
    return e.date >= currentDate;
  };

  const isArchivedMeeting = (m: Meeting) => {
    if (!m.date) return false;
    return m.date < currentDate && m.status !== "done";
  };

  const isArchivedEvent = (e: EventItem) => {
    if (e.recurrence === "weekly") return false;
    if (!e.date) return false;
    return e.date < currentDate && e.status !== "done";
  };

  const effectiveEventFilter = eventFilter;

  // Date Scoped lists (Today = only today, Upcoming = today + all after, Archived = past uncompleted, All = all dates)
  const dateScopedMeetings = meetings.filter((m) => {
    if (meetingFilter === "archived") return isArchivedMeeting(m);
    if (dateScope === "today") return isTodayMeeting(m);
    if (dateScope === "upcoming") return isUpcomingMeeting(m);
    if (dateScope === "archived") return isArchivedMeeting(m);
    return true;
  });

  const dateScopedEvents = events.filter((e) => {
    if (effectiveEventFilter === "archived") return isArchivedEvent(e);
    if (dateScope === "today") return isTodayEvent(e);
    if (dateScope === "upcoming") return isUpcomingEvent(e);
    if (dateScope === "archived") return isArchivedEvent(e);
    return true;
  });

  const todayMeetingsCount = meetings.filter(isTodayMeeting).length;
  const todayEventsCount = events.filter(isTodayEvent).length;
  const upcomingMeetingsCount = meetings.filter(isUpcomingMeeting).length;
  const upcomingEventsCount = events.filter(isUpcomingEvent).length;
  const archivedMeetingsCount = meetings.filter(isArchivedMeeting).length;
  const archivedEventsCount = events.filter(isArchivedEvent).length;

  // Counts based on active date scope
  const pendingMeetingsCount = dateScopedMeetings.filter((m) => m.status !== "done").length;
  const doneMeetingsCount = dateScopedMeetings.filter((m) => m.status === "done").length;

  const oursEventsCount = dateScopedEvents.filter((e) => e.category === "Ours").length;
  const othersEventsCount = dateScopedEvents.filter((e) => e.category === "Others" || e.category === "Imp").length;
  const recurringEventsCount = dateScopedEvents.filter((e) => e.recurrence === "weekly").length;

  // Filtered lists (sorted chronologically: date ascending, then time ascending)
  const filteredMeetings = dateScopedMeetings
    .filter((m) => {
      if (meetingFilter === "pending") return m.status !== "done";
      if (meetingFilter === "done") return m.status === "done";
      if (meetingFilter === "archived") return isArchivedMeeting(m);
      return true;
    })
    .sort((a, b) => {
      const dateA = a.date || currentDate;
      const dateB = b.date || currentDate;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);
      if (timeA !== timeB) return timeA - timeB;
      return (a.projectId || "").localeCompare(b.projectId || "");
    });

  const filteredEvents = dateScopedEvents
    .filter((e) => {
      if (effectiveEventFilter === "ours") return e.category === "Ours";
      if (effectiveEventFilter === "others" || effectiveEventFilter === "imp") return e.category === "Others" || e.category === "Imp";
      if (effectiveEventFilter === "recurring") return e.recurrence === "weekly";
      if (effectiveEventFilter === "archived") return isArchivedEvent(e);
      return true;
    })
    .sort((a, b) => {
      // 1. Re-occurring events MUST be on top!
      const isRecA = a.recurrence === "weekly" ? 1 : 0;
      const isRecB = b.recurrence === "weekly" ? 1 : 0;
      if (isRecA !== isRecB) return isRecB - isRecA; // recurring first

      // If both are recurring, sort by day of week (0 to 6), then time
      if (isRecA && isRecB) {
        const dayA = typeof a.recurringDay === "number" ? a.recurringDay : (a.date ? new Date(a.date + "T12:00:00").getDay() : 0);
        const dayB = typeof b.recurringDay === "number" ? b.recurringDay : (b.date ? new Date(b.date + "T12:00:00").getDay() : 0);
        if (dayA !== dayB) return dayA - dayB;
        const timeA = parseTimeToMinutes(a.time);
        const timeB = parseTimeToMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return (a.title || "").localeCompare(b.title || "");
      }

      // One-time events: sort by date ascending, then time ascending
      const dateA = a.date || currentDate;
      const dateB = b.date || currentDate;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = parseTimeToMinutes(a.time);
      const timeB = parseTimeToMinutes(b.time);
      if (timeA !== timeB) return timeA - timeB;
      return (a.title || "").localeCompare(b.title || "");
    });

  const showMeetingsSection = true;
  const showEventsSection = true;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: trackerOpen ? 16 : 0 }}>
      {/* ── Top Header Toolbar with Minimize Chevron ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: trackerOpen ? 8 : 0 }}>
          <div
            onClick={() => setTrackerOpen(!trackerOpen)}
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}
            title="Click dropdown chevron to toggle Tracker"
          >
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#78716C"
              }}
            >
              {trackerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <Calendar size={13} color="#78716C" />
            <h3 style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "#78716C", margin: 0 }}>
              Tracker
            </h3>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 10,
                background: "#F5F5F4",
                color: "#78716C"
              }}
            >
              {dateScopedMeetings.length + dateScopedEvents.length}
            </span>
          </div>
        </div>

        {trackerOpen && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              width: "100%",
              boxSizing: "border-box",
              marginTop: 4
            }}
          >
            {[
              {
                id: "today" as const,
                label: "Today",
                count: todayMeetingsCount + todayEventsCount,
                icon: Calendar,
                activeColor: "#2563EB",
                activeBg: "#FFFFFF",
                activeBorder: "#BFDBFE",
                badgeBg: "#EFF6FF",
                badgeColor: "#1D4ED8",
                badgeBorder: "#DBEAFE",
                title: "Only today's meetings and events"
              },
              {
                id: "upcoming" as const,
                label: "Upcoming",
                count: upcomingMeetingsCount + upcomingEventsCount,
                icon: Clock,
                activeColor: "#7C3AED",
                activeBg: "#FFFFFF",
                activeBorder: "#DDD6FE",
                badgeBg: "#F5F3FF",
                badgeColor: "#6D28D9",
                badgeBorder: "#EDE9FE",
                title: "Today and upcoming meetings and events"
              },
              {
                id: "archived" as const,
                label: "Archived",
                count: archivedMeetingsCount + archivedEventsCount,
                icon: Archive,
                activeColor: "#D97706",
                activeBg: "#FFFFFF",
                activeBorder: "#FDE68A",
                badgeBg: "#FEF3C7",
                badgeColor: "#B45309",
                badgeBorder: "#FDE68A",
                title: "Past uncompleted meetings and events"
              },
              {
                id: "all" as const,
                label: "All",
                count: meetings.length + events.length,
                icon: Layers,
                activeColor: "#0F172A",
                activeBg: "#FFFFFF",
                activeBorder: "#CBD5E1",
                badgeBg: "#F1F5F9",
                badgeColor: "#334155",
                badgeBorder: "#E2E8F0",
                title: "All meetings and events across all dates"
              }
            ].map((tab) => {
              const isActive = dateScope === tab.id;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDateScope(tab.id)}
                  title={tab.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 9px",
                    borderRadius: 8,
                    border: isActive ? `1.5px solid ${tab.activeBorder}` : "1.5px solid #E7E5E4",
                    background: isActive ? tab.activeBg : "#FBFBFA",
                    color: isActive ? tab.activeColor : "#57534E",
                    boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxSizing: "border-box",
                    minWidth: 0,
                    width: "100%",
                    outline: "none"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#F5F5F4";
                      e.currentTarget.style.color = "#1C1917";
                      e.currentTarget.style.borderColor = "#D6D3D1";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#FBFBFA";
                      e.currentTarget.style.color = "#57534E";
                      e.currentTarget.style.borderColor = "#E7E5E4";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5.5, minWidth: 0 }}>
                    <IconComp size={12} color={isActive ? tab.activeColor : "#78716C"} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: isActive ? 700 : 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        letterSpacing: "-0.01em"
                      }}
                    >
                      {tab.label}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 5.5px",
                      borderRadius: 10,
                      background: isActive ? tab.badgeBg : "#E7E5E4",
                      color: isActive ? tab.badgeColor : "#78716C",
                      border: isActive ? `1px solid ${tab.badgeBorder}` : "1px solid transparent",
                      minWidth: 15,
                      textAlign: "center",
                      flexShrink: 0,
                      lineHeight: "14px",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {trackerOpen && (
        <>
      {/* ══════════════════════════════════════════
          CATEGORY 1: MEETINGS (WITH DROPDOWNS)
         ══════════════════════════════════════════ */}
      {showMeetingsSection && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Header Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 4,
              borderBottom: "1px solid #F5F5F4"
            }}
          >
            <div
              onClick={() => setMeetingsOpen(!meetingsOpen)}
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}
              title="Click dropdown chevron to toggle meetings"
            >
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: "#78716C"
                }}
              >
                {meetingsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "#1C1917" }}>
                Meetings
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: "#EFF6FF",
                  color: "#2563EB"
                }}
              >
                {dateScopedMeetings.length}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Meeting Status Filter Dropdown */}
              <select
                value={meetingFilter}
                onChange={(e) => setMeetingFilter(e.target.value as any)}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: "1px solid #E7E5E4",
                  background: "#fff",
                  color: "#78716C",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="all">All ({dateScopedMeetings.length})</option>
                <option value="pending">Pending ({pendingMeetingsCount})</option>
                <option value="done">Done ({doneMeetingsCount})</option>
                {archivedMeetingsCount > 0 && (
                  <option value="archived">Archived ({archivedMeetingsCount})</option>
                )}
              </select>

              {!showAddMeetingForm && (
                <button
                  onClick={() => {
                    setMeetingsOpen(true);
                    setShowAddMeetingForm(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563EB",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 2
                  }}
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>
          </div>

          {/* Meetings Content (Collapsible Dropdown Area) */}
          {meetingsOpen && (
            <div>
              {/* Add Meeting Form */}
              {showAddMeetingForm && (
                <div style={{ ...cardStyle, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#78716C" }}>NEW MEETING</span>
                    <button
                      onClick={() => {
                        setShowAddMeetingForm(false);
                        setShowEmpDropdown(false);
                      }}
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
                        width: "100%",
                        fontSize: 12,
                        padding: "7px 10px",
                        borderRadius: 8,
                        border: "1px solid #E7E5E4",
                        background: "#FAFAF9",
                        outline: "none",
                        color: "#1C1917"
                      }}
                    >
                      <option value="">Select Project...</option>
                      {projects.map((p) => (
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
                        style={{ ...inputStyle, marginTop: 6, fontSize: 12, padding: "7px 10px" }}
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
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 12,
                        padding: "7px 10px",
                        borderRadius: 8,
                        border: "1px solid #E7E5E4",
                        background: "#FAFAF9",
                        color: "#1C1917",
                        textAlign: "left",
                        cursor: "pointer"
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                        {selectedEmployeeIds.length === 0
                          ? "Select Employees..."
                          : `Selected: ${selectedEmployeeIds
                              .map((id) => {
                                const found = employees.find((e) => e.id === id);
                                return found ? found.name : "";
                              })
                              .filter(Boolean)
                              .join(", ")}`}
                      </span>
                      <ChevronDown size={14} color="#78716C" />
                    </button>

                    {showEmpDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 100,
                          marginBottom: 4,
                          background: "#fff",
                          borderRadius: 8,
                          border: "1px solid #E7E5E4",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          maxHeight: 150,
                          overflowY: "auto",
                          padding: 6
                        }}
                      >
                        {employees.length === 0 ? (
                          <div style={{ padding: "8px 10px", fontSize: 11, color: "#A8A29E" }}>No employees. Type custom name below.</div>
                        ) : (
                          employees.map((emp) => {
                            const isChecked = selectedEmployeeIds.includes(emp.id);
                            return (
                              <label
                                key={emp.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  background: isChecked ? "#F3F4F6" : "transparent",
                                  color: "#1C1917"
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== emp.id));
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
                      style={{ ...inputStyle, marginTop: 6, fontSize: 12, padding: "7px 10px" }}
                    />
                  </div>

                  {/* Date & Time Inputs */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 4 }}>DATE</label>
                      <div style={{ position: "relative", width: "100%" }}>
                        <Calendar size={12} color="#A8A29E" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          type="date"
                          value={meetingDate}
                          onChange={(e) => setMeetingDate(e.target.value)}
                          style={{ ...inputStyle, width: "100%", boxSizing: "border-box", minWidth: 0, paddingLeft: 26, fontSize: 12, paddingTop: 6, paddingBottom: 6 }}
                        />
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 4 }}>TIME</label>
                      <div style={{ position: "relative", width: "100%" }}>
                        <Clock size={12} color="#A8A29E" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          type="text"
                          placeholder="e.g., 2:30 PM"
                          value={meetingTime}
                          onChange={(e) => setMeetingTime(e.target.value)}
                          style={{ ...inputStyle, width: "100%", boxSizing: "border-box", minWidth: 0, paddingLeft: 26, fontSize: 12, paddingTop: 6, paddingBottom: 6 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <button
                      onClick={handleAddMeeting}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        borderRadius: 8,
                        border: "none",
                        background: "linear-gradient(135deg,#2563EB,#7C3AED)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(37,99,235,0.15)"
                      }}
                    >
                      Save Meeting
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMeetingForm(false);
                        setShowEmpDropdown(false);
                      }}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 8,
                        border: "1px solid #E7E5E4",
                        background: "#fff",
                        color: "#78716C",
                        fontSize: 12,
                        cursor: "pointer"
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Meeting Items List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredMeetings.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "10px 8px", color: "#A8A29E", border: "1px dashed #E7E5E4", borderRadius: 8 }}>
                    <p style={{ fontSize: 11, margin: 0, fontWeight: 500 }}>
                      {dateScopedMeetings.length === 0
                        ? (dateScope === "all" ? "No meetings scheduled." : dateScope === "archived" ? "No archived meetings." : dateScope === "today" ? "No meetings today." : "No upcoming meetings.")
                        : "No meetings match this filter."}
                    </p>
                  </div>
                ) : (
                  filteredMeetings.map((m) => {
                    const projColor = getProjectColor(m.projectId);
                    const statusConfig = statusColorMap[m.status] || statusColorMap.not_started;
                    const isEditing = editingMeetingId === m.id;

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
                          const actionBtns = e.currentTarget.querySelectorAll(".tracker-action-btn") as NodeListOf<HTMLElement>;
                          actionBtns.forEach((b) => { b.style.opacity = "1"; });
                        }}
                        onMouseLeave={(e) => {
                          const actionBtns = e.currentTarget.querySelectorAll(".tracker-action-btn") as NodeListOf<HTMLElement>;
                          actionBtns.forEach((b) => { b.style.opacity = "0"; });
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 95px", gap: 6, alignItems: "center", width: "100%" }}>
                              <input
                                autoFocus
                                value={editMeetingTitle}
                                onChange={(e) => setEditMeetingTitle(e.target.value)}
                                placeholder="Title / Project"
                                style={{ ...inputStyle, width: "100%", minWidth: 0, boxSizing: "border-box", fontSize: 12, padding: "5px 8px" }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEditMeeting(m.id);
                                  if (e.key === "Escape") setEditingMeetingId(null);
                                }}
                              />
                              <input
                                value={editMeetingTime}
                                onChange={(e) => setEditMeetingTime(e.target.value)}
                                placeholder="Time (e.g. 2:30 PM)"
                                style={{ ...inputStyle, width: "100%", minWidth: 0, boxSizing: "border-box", fontSize: 12, padding: "5px 8px" }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEditMeeting(m.id);
                                  if (e.key === "Escape") setEditingMeetingId(null);
                                }}
                              />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ position: "relative", flex: 1 }}>
                                <Calendar size={11} color="#A8A29E" style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)" }} />
                                <input
                                  type="date"
                                  value={editMeetingDate}
                                  onChange={(e) => setEditMeetingDate(e.target.value)}
                                  style={{ ...inputStyle, paddingLeft: 24, fontSize: 11, padding: "4px 8px 4px 24px" }}
                                />
                              </div>
                              <button
                                onClick={() => setEditingMeetingId(null)}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  background: "none",
                                  border: "1px solid #E7E5E4",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  color: "#78716C"
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEditMeeting(m.id)}
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: "#2563EB",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  cursor: "pointer"
                                }}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0, cursor: "pointer" }}
                              onDoubleClick={() => {
                                setEditingMeetingId(m.id);
                                setEditMeetingTitle(m.projectId);
                                setEditMeetingTime(m.time);
                                setEditMeetingDate(m.date || currentDate);
                              }}
                              title="Double-click to edit meeting"
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", minWidth: 0 }}>
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
                                    maxWidth: 105,
                                    flexShrink: 0
                                  }}
                                >
                                  {m.projectId}
                                </span>

                                {/* Time */}
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "#78716C",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    whiteSpace: "nowrap",
                                    flexShrink: 0
                                  }}
                                >
                                  <Clock size={11} color="#A8A29E" style={{ flexShrink: 0 }} />
                                  {m.time}
                                </span>

                                {/* Date Badge */}
                                {m.date && (
                                  <span
                                    title={`Date: ${m.date}`}
                                    style={{
                                      fontSize: 10,
                                      color: isArchivedMeeting(m) ? "#B45309" : "#78716C",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                      background: isArchivedMeeting(m) ? "#FEF3C7" : "#F5F5F4",
                                      border: isArchivedMeeting(m) ? "1px solid #FDE68A" : "none",
                                      padding: "1.5px 6px",
                                      borderRadius: 5,
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                      flexShrink: 0
                                    }}
                                  >
                                    <Calendar size={10} color={isArchivedMeeting(m) ? "#B45309" : "#A8A29E"} style={{ flexShrink: 0 }} />
                                    {m.date === currentDate ? "Today" : formatDateDisplay(m.date)}
                                  </span>
                                )}
                              </div>

                              {/* Employees Avatars List */}
                              {m.employeeIds && m.employeeIds.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
                                  <div style={{ display: "flex", alignItems: "center" }}>
                                    {m.employeeIds.slice(0, 3).map((empName: string, i: number) => {
                                      const avatarBg = getAvatarColor(empName);
                                      return (
                                        <div
                                          key={i}
                                          title={empName}
                                          style={{
                                            width: 19,
                                            height: 19,
                                            borderRadius: "50%",
                                            background: avatarBg,
                                            border: "1.5px solid #fff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#fff",
                                            fontSize: 8.5,
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
                                          width: 19,
                                          height: 19,
                                          borderRadius: "50%",
                                          background: "#E7E5E4",
                                          border: "1.5px solid #fff",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: "#78716C",
                                          fontSize: 8.5,
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
                                  {m.employeeIds.length === 1 && (
                                    <span style={{ fontSize: 11, color: "#78716C", marginLeft: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {m.employeeIds[0]}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons & Status Cycle */}
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                              {isArchivedMeeting(m) && (
                                <button
                                  onClick={() => onEditMeeting?.(m.id, { ...m, date: currentDate })}
                                  className="tracker-action-btn"
                                  style={{
                                    background: "#EFF6FF",
                                    border: "1px solid #BFDBFE",
                                    color: "#2563EB",
                                    opacity: 0,
                                    cursor: "pointer",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    transition: "opacity 0.1s"
                                  }}
                                  title="Reschedule to Today"
                                >
                                  <ArrowRight size={10} /> Today
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setEditingMeetingId(m.id);
                                  setEditMeetingTitle(m.projectId);
                                  setEditMeetingTime(m.time);
                                  setEditMeetingDate(m.date || currentDate);
                                }}
                                className="tracker-action-btn"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#78716C",
                                  opacity: 0,
                                  cursor: "pointer",
                                  padding: 3,
                                  borderRadius: 4,
                                  transition: "opacity 0.1s"
                                }}
                                title="Edit meeting"
                              >
                                <Pencil size={12} />
                              </button>

                              <button
                                onClick={() => onDeleteMeeting(m.id)}
                                className="tracker-action-btn"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#EF4444",
                                  opacity: 0,
                                  cursor: "pointer",
                                  padding: 3,
                                  borderRadius: 4,
                                  transition: "opacity 0.1s"
                                }}
                                title="Delete meeting"
                              >
                                <Trash2 size={12} />
                              </button>

                              <button
                                onClick={() => onCycleMeetingStatus(m.id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  background: statusConfig.bg,
                                  border: `1.5px solid ${statusConfig.border}`,
                                  cursor: "pointer",
                                  padding: 0,
                                  transition: "all 0.15s"
                                }}
                                title={`Status: ${m.status.replace("_", " ")} (Click to change)`}
                              >
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusConfig.dot }} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          CATEGORY 2: EVENTS (WITH DROPDOWNS)
         ══════════════════════════════════════════ */}
      {showEventsSection && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: showMeetingsSection ? 8 : 0 }}>
          {/* Header Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 4,
              borderBottom: "1px solid #F5F5F4"
            }}
          >
            <div
              onClick={() => setEventsOpen(!eventsOpen)}
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}
              title="Click dropdown chevron to toggle events"
            >
              <button
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: "#78716C"
                }}
              >
                {eventsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "#1C1917" }}>
                Events
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: "#F5F3FF",
                  color: "#7C3AED"
                }}
              >
                {dateScopedEvents.length}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Event Subcategory Dropdown */}
              <select
                value={effectiveEventFilter}
                onChange={(e) => setEventFilter(e.target.value as any)}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: "1px solid #E7E5E4",
                  background: "#fff",
                  color: "#78716C",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="all">All Events ({dateScopedEvents.length})</option>
                <option value="ours">Ours ({oursEventsCount})</option>
                <option value="others">Others ({othersEventsCount})</option>
                <option value="recurring">Re-occurring ({recurringEventsCount})</option>
                {archivedEventsCount > 0 && (
                  <option value="archived">Archived ({archivedEventsCount})</option>
                )}
              </select>

              {!showAddEventForm && (
                <button
                  onClick={() => {
                    setEventsOpen(true);
                    setShowAddEventForm(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#7C3AED",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 2
                  }}
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>
          </div>

          {/* Events Content (Collapsible Dropdown Area) */}
          {eventsOpen && (
            <div>
              {/* Quick Subcategory Pills Toggle */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                <button
                  onClick={() => {
                    setEventFilter("all");
                    if (dateScope !== "all" && events.length > dateScopedEvents.length) {
                      setDateScope("all");
                    }
                  }}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: effectiveEventFilter === "all" ? "1px solid #7C3AED" : "1px solid #E7E5E4",
                    background: effectiveEventFilter === "all" ? "#F5F3FF" : "#fff",
                    color: effectiveEventFilter === "all" ? "#7C3AED" : "#78716C"
                  }}
                >
                  All ({dateScope === "all" ? events.length : dateScopedEvents.length})
                </button>
                <button
                  onClick={() => setEventFilter("ours")}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: effectiveEventFilter === "ours" ? "1px solid #6366F1" : "1px solid #E7E5E4",
                    background: effectiveEventFilter === "ours" ? "#EEF2FF" : "#fff",
                    color: effectiveEventFilter === "ours" ? "#4F46E5" : "#78716C"
                  }}
                >
                  Ours ({oursEventsCount})
                </button>
                <button
                  onClick={() => setEventFilter("others")}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: (effectiveEventFilter === "others" || effectiveEventFilter === "imp") ? "1px solid #F59E0B" : "1px solid #E7E5E4",
                    background: (effectiveEventFilter === "others" || effectiveEventFilter === "imp") ? "#FEF3C7" : "#fff",
                    color: (effectiveEventFilter === "others" || effectiveEventFilter === "imp") ? "#D97706" : "#78716C"
                  }}
                >
                  ★ Others ({othersEventsCount})
                </button>
                {archivedEventsCount > 0 && (
                  <button
                    onClick={() => setEventFilter("archived")}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: effectiveEventFilter === "archived" ? "1px solid #DC2626" : "1px solid #E7E5E4",
                      background: effectiveEventFilter === "archived" ? "#FEF2F2" : "#fff",
                      color: effectiveEventFilter === "archived" ? "#DC2626" : "#78716C"
                    }}
                  >
                    Archived ({archivedEventsCount})
                  </button>
                )}
              </div>

              {/* Add Event Form */}
              {showAddEventForm && (
                <div style={{ ...cardStyle, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 10, width: "100%", boxSizing: "border-box" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#78716C" }}>NEW EVENT</span>
                    <button
                      onClick={() => setShowAddEventForm(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E" }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Title */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 4 }}>EVENT TITLE</label>
                    <input
                      type="text"
                      placeholder="e.g., Masterclass, Luma Meetup, Demo..."
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      style={{ ...inputStyle, width: "100%", boxSizing: "border-box", fontSize: 12, padding: "7px 10px" }}
                    />
                  </div>

                  {/* Category Dropdown (Ours | Others) */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 4 }}>CATEGORY</label>
                    <select
                      value={eventCategory}
                      onChange={(e) => setEventCategory(e.target.value as EventCategory)}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        fontSize: 12,
                        padding: "7px 10px",
                        borderRadius: 8,
                        border: "1px solid #E7E5E4",
                        background: "#FAFAF9",
                        outline: "none",
                        color: "#1C1917",
                        fontWeight: 600
                      }}
                    >
                      <option value="Ours">Ours (Our Event / Hosted)</option>
                      <option value="Others">Others (External / Other Event)</option>
                    </select>
                  </div>

                  {/* Date & Recurrence Inputs */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 4 }}>DATE</label>
                      <div style={{ position: "relative", width: "100%" }}>
                        <Calendar size={12} color="#A8A29E" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          style={{ ...inputStyle, width: "100%", boxSizing: "border-box", minWidth: 0, paddingLeft: 26, fontSize: 12, paddingTop: 6, paddingBottom: 6 }}
                        />
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 4 }}>
                        RECURRENCE
                      </label>
                      <select
                        value={eventRecurrence}
                        onChange={(e) => setEventRecurrence(e.target.value as EventRecurrence)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          minWidth: 0,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "7px 8px",
                          borderRadius: 8,
                          border: "1px solid #E7E5E4",
                          background: "#FAFAF9",
                          outline: "none",
                          color: "#1C1917"
                        }}
                      >
                        <option value="one_time">One-time</option>
                        <option value="weekly">
                          {eventDate ? `${getDayShort(eventDate)} (Re-Occuring)` : "Re-Occuring"}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Time & Location Inputs */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 4, whiteSpace: "nowrap" }}>TIME (OPTIONAL)</label>
                      <div style={{ position: "relative", width: "100%" }}>
                        <Clock size={12} color="#A8A29E" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          type="text"
                          placeholder="e.g. 7:00 PM"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          style={{ ...inputStyle, width: "100%", boxSizing: "border-box", minWidth: 0, paddingLeft: 26, fontSize: 12, paddingTop: 6, paddingBottom: 6 }}
                        />
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <label
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#A8A29E",
                          display: "block",
                          marginBottom: 4,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                        title="PLATFORM / LOCATION"
                      >
                        PLATFORM / LOCATION
                      </label>
                      <div style={{ position: "relative", width: "100%" }}>
                        <MapPin size={12} color="#A8A29E" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          type="text"
                          placeholder="e.g. Luma, Zoom"
                          value={eventLocation}
                          onChange={(e) => setEventLocation(e.target.value)}
                          style={{ ...inputStyle, width: "100%", boxSizing: "border-box", minWidth: 0, paddingLeft: 26, fontSize: 12, paddingTop: 6, paddingBottom: 6 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <button
                      onClick={handleAddEvent}
                      style={{
                        flex: 1,
                        padding: "7px 0",
                        borderRadius: 8,
                        border: "none",
                        background: "linear-gradient(135deg,#7C3AED,#6366F1)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(124,58,237,0.15)"
                      }}
                    >
                      Save Event
                    </button>
                    <button
                      onClick={() => setShowAddEventForm(false)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 8,
                        border: "1px solid #E7E5E4",
                        background: "#fff",
                        color: "#78716C",
                        fontSize: 12,
                        cursor: "pointer"
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Event Items List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredEvents.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "10px 8px", color: "#A8A29E", border: "1px dashed #E7E5E4", borderRadius: 8 }}>
                    <p style={{ fontSize: 11, margin: 0, fontWeight: 500 }}>
                      {dateScopedEvents.length === 0
                        ? (dateScope === "all" ? "No events scheduled." : dateScope === "archived" ? "No archived events." : dateScope === "today" ? "No events today." : "No upcoming events.")
                        : "No events in this category."}
                    </p>
                    {events.length > 0 && dateScope === "upcoming" && (
                      <button
                        onClick={() => setDateScope("all")}
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#7C3AED",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        View all {events.length} events across all dates
                      </button>
                    )}
                  </div>
                ) : (
                  filteredEvents.map((evt) => {
                    const statusConfig = statusColorMap[evt.status] || statusColorMap.not_started;
                    const isEditing = editingEventId === evt.id;

                    return (
                      <div
                        key={evt.id}
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
                          const actionBtns = e.currentTarget.querySelectorAll(".tracker-action-btn") as NodeListOf<HTMLElement>;
                          actionBtns.forEach((b) => { b.style.opacity = "1"; });
                        }}
                        onMouseLeave={(e) => {
                          const actionBtns = e.currentTarget.querySelectorAll(".tracker-action-btn") as NodeListOf<HTMLElement>;
                          actionBtns.forEach((b) => { b.style.opacity = "0"; });
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center", width: "100%" }}>
                              <input
                                autoFocus
                                value={editEventTitle}
                                onChange={(e) => setEditEventTitle(e.target.value)}
                                placeholder="Event Title"
                                style={{ ...inputStyle, width: "100%", minWidth: 0, boxSizing: "border-box", fontSize: 12, padding: "5px 8px" }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEditEvent(evt.id);
                                  if (e.key === "Escape") setEditingEventId(null);
                                }}
                              />
                              <select
                                value={editEventCategory}
                                onChange={(e) => setEditEventCategory(e.target.value as EventCategory)}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "5px 6px",
                                  borderRadius: 6,
                                  border: "1px solid #E7E5E4",
                                  background: "#FAFAF9",
                                  color: "#1C1917",
                                  boxSizing: "border-box",
                                  flexShrink: 0
                                }}
                              >
                                <option value="Ours">Ours</option>
                                <option value="Others">Others</option>
                              </select>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, alignItems: "center", width: "100%" }}>
                              <input
                                type="date"
                                value={editEventDate}
                                onChange={(e) => setEditEventDate(e.target.value)}
                                style={{ ...inputStyle, width: "100%", minWidth: 0, boxSizing: "border-box", fontSize: 11, padding: "4px 6px" }}
                              />
                              <select
                                value={editEventRecurrence}
                                onChange={(e) => setEditEventRecurrence(e.target.value as EventRecurrence)}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "4px 6px",
                                  borderRadius: 6,
                                  border: "1px solid #E7E5E4",
                                  background: "#FAFAF9",
                                  color: "#1C1917",
                                  width: "100%",
                                  minWidth: 0,
                                  boxSizing: "border-box"
                                }}
                              >
                                <option value="one_time">One-time</option>
                                <option value="weekly">
                                  {editEventDate ? `${getDayShort(editEventDate)} (Re-Occuring)` : "Re-Occuring"}
                                </option>
                              </select>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, alignItems: "center", width: "100%" }}>
                              <input
                                value={editEventTime}
                                onChange={(e) => setEditEventTime(e.target.value)}
                                placeholder="Time (e.g. 7:00 PM)"
                                style={{ ...inputStyle, width: "100%", minWidth: 0, boxSizing: "border-box", fontSize: 11, padding: "4px 8px" }}
                              />
                              <input
                                value={editEventLocation}
                                onChange={(e) => setEditEventLocation(e.target.value)}
                                placeholder="Platform / Location"
                                style={{ ...inputStyle, width: "100%", minWidth: 0, boxSizing: "border-box", fontSize: 11, padding: "4px 8px" }}
                              />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                              <button
                                onClick={() => setEditingEventId(null)}
                                style={{
                                  padding: "3px 8px",
                                  fontSize: 11,
                                  background: "none",
                                  border: "1px solid #E7E5E4",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  color: "#78716C"
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEditEvent(evt.id)}
                                style={{
                                  padding: "3px 10px",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: "#7C3AED",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  cursor: "pointer"
                                }}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0, cursor: "pointer" }}
                              onDoubleClick={() => {
                                setEditingEventId(evt.id);
                                setEditEventTitle(evt.title);
                                setEditEventCategory(evt.category);
                                setEditEventTime(evt.time || "");
                                setEditEventLocation(evt.location || "");
                                setEditEventDate(evt.date || currentDate);
                                setEditEventRecurrence(evt.recurrence || "one_time");
                              }}
                              title="Double-click to edit event"
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                {/* Category Badge */}
                                {evt.category === "Ours" ? (
                                  <span
                                    style={{
                                      padding: "1.5px 7px",
                                      borderRadius: 6,
                                      background: "#EEF2FF",
                                      color: "#4F46E5",
                                      border: "1px solid #C7D2FE",
                                      fontSize: 10,
                                      fontWeight: 800,
                                      letterSpacing: 0.5,
                                      textTransform: "uppercase"
                                    }}
                                  >
                                    OURS
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      padding: "1.5px 7px",
                                      borderRadius: 6,
                                      background: "#FEF3C7",
                                      color: "#D97706",
                                      border: "1px solid #FDE68A",
                                      fontSize: 10,
                                      fontWeight: 800,
                                      letterSpacing: 0.5,
                                      textTransform: "uppercase",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3
                                    }}
                                  >
                                    <Star size={9} fill="#D97706" color="#D97706" /> OTHERS
                                  </span>
                                )}

                                {/* Recurrence Badge */}
                                {evt.recurrence === "weekly" ? (
                                  <span
                                    title={`Re-occurring every ${typeof evt.recurringDay === "number" ? DAYS_OF_WEEK[evt.recurringDay] : "week"}`}
                                    style={{
                                      padding: "1.5px 6px",
                                      borderRadius: 6,
                                      background: "#F0FDF4",
                                      color: "#16A34A",
                                      border: "1px solid #BBF7D0",
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    <Repeat size={9} />
                                    {getRecurringDayLabel(evt)}
                                  </span>
                                ) : (
                                  <span
                                    title="One-time event"
                                    style={{
                                      padding: "1px 5px",
                                      borderRadius: 4,
                                      background: "#F5F5F4",
                                      color: "#A8A29E",
                                      fontSize: 9,
                                      fontWeight: 600
                                    }}
                                  >
                                    1-time
                                  </span>
                                )}

                                {/* Date Badge (only shown for one-time events; recurring events show day re-occuring label) */}
                                {evt.recurrence !== "weekly" && evt.date && (
                                  <span
                                    title={`Date: ${evt.date}`}
                                    style={{
                                      fontSize: 10,
                                      color: isArchivedEvent(evt) ? "#B45309" : "#78716C",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                      background: isArchivedEvent(evt) ? "#FEF3C7" : "#F5F5F4",
                                      border: isArchivedEvent(evt) ? "1px solid #FDE68A" : "none",
                                      padding: "1px 5px",
                                      borderRadius: 4,
                                      fontWeight: 600,
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    <Calendar size={10} color={isArchivedEvent(evt) ? "#B45309" : "#A8A29E"} />
                                    {evt.date === currentDate ? "Today" : formatDateDisplay(evt.date)}
                                  </span>
                                )}

                                {/* Archived Badge */}
                                {isArchivedEvent(evt) && (
                                  <span
                                    title="Past uncompleted event (Archived)"
                                    style={{
                                      padding: "1px 5px",
                                      borderRadius: 4,
                                      background: "#FFFBEB",
                                      color: "#B45309",
                                      border: "1px solid #FDE68A",
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                      whiteSpace: "nowrap",
                                      flexShrink: 0
                                    }}
                                  >
                                    <Archive size={9} /> Archived
                                  </span>
                                )}

                                {/* Event Title */}
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: evt.status === "done" ? "#A8A29E" : "#1C1917",
                                    textDecoration: evt.status === "done" ? "line-through" : "none",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  }}
                                >
                                  {evt.title}
                                </span>
                              </div>

                              {/* Details: Time and Location */}
                              {(evt.time || evt.location) && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#78716C", marginTop: 2, flexWrap: "nowrap" }}>
                                  {evt.time && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap", flexShrink: 0 }}>
                                      <Clock size={11} color="#A8A29E" style={{ flexShrink: 0 }} />
                                      {evt.time}
                                    </span>
                                  )}
                                  {evt.location && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      <MapPin size={11} color="#A8A29E" style={{ flexShrink: 0 }} />
                                      {evt.location}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons & Status Cycle */}
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                              {isArchivedEvent(evt) && (
                                <button
                                  onClick={() => onEditEvent?.(evt.id, { ...evt, date: currentDate })}
                                  className="tracker-action-btn"
                                  style={{
                                    background: "#F5F3FF",
                                    border: "1px solid #DDD6FE",
                                    color: "#7C3AED",
                                    opacity: 0,
                                    cursor: "pointer",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    transition: "opacity 0.1s"
                                  }}
                                  title="Reschedule to Today"
                                >
                                  <ArrowRight size={10} /> Today
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setEditingEventId(evt.id);
                                  setEditEventTitle(evt.title);
                                  setEditEventCategory(evt.category);
                                  setEditEventTime(evt.time || "");
                                  setEditEventLocation(evt.location || "");
                                  setEditEventDate(evt.date || currentDate);
                                  setEditEventRecurrence(evt.recurrence || "one_time");
                                }}
                                className="tracker-action-btn"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#78716C",
                                  opacity: 0,
                                  cursor: "pointer",
                                  padding: 3,
                                  borderRadius: 4,
                                  transition: "opacity 0.1s"
                                }}
                                title="Edit event"
                              >
                                <Pencil size={12} />
                              </button>

                              <button
                                onClick={() => onDeleteEvent(evt.id)}
                                className="tracker-action-btn"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#EF4444",
                                  opacity: 0,
                                  cursor: "pointer",
                                  padding: 3,
                                  borderRadius: 4,
                                  transition: "opacity 0.1s"
                                }}
                                title="Delete event"
                              >
                                <Trash2 size={12} />
                              </button>

                              <button
                                onClick={() => onCycleEventStatus(evt.id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  background: statusConfig.bg,
                                  border: `1.5px solid ${statusConfig.border}`,
                                  cursor: "pointer",
                                  padding: 0,
                                  transition: "all 0.15s"
                                }}
                                title={`Status: ${evt.status.replace("_", " ")} (Click to change)`}
                              >
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusConfig.dot }} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}
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
  const [sectionOpen, setSectionOpen] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getTasksForEmployee = (empName: string) => {
    const cleanName = empName.toLowerCase().trim();
    const searchStr = `@${cleanName}`;
    // regex to strip the @Name tag (case-insensitive) from the displayed text
    const stripRe = new RegExp(`\\s*@${empName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");

    const rowEmpMatches = (rowEmp?: string) => {
      if (!rowEmp) return false;
      const cleanRow = rowEmp.replace(/^@/, "").toLowerCase().trim();
      return cleanRow === cleanName;
    };

    const results: { id: string; text: string; status: Status }[] = [];

    // SubTasks ─ chip-based rows
    subTasks.forEach((s) => {
      if (s.chips && s.chips.length > 0) {
        s.chips.forEach((chip, idx) => {
          const chipHasThisEmp = chip.text.toLowerCase().includes(searchStr);
          const chipHasOtherEmp = /@[A-Za-z0-9_]+/i.test(chip.text) && !chipHasThisEmp;
          if (chipHasThisEmp || (rowEmpMatches(s.employee) && !chipHasOtherEmp)) {
            const cleanText = chip.text.replace(stripRe, "").trim();
            results.push({ id: `${s.id}_c${idx}`, text: cleanText || chip.text, status: chip.status });
          }
        });
      } else {
        const textHit = s.text.toLowerCase().includes(searchStr);
        const empHit = rowEmpMatches(s.employee);
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
          const chipHasThisEmp = chip.text.toLowerCase().includes(searchStr);
          const chipHasOtherEmp = /@[A-Za-z0-9_]+/i.test(chip.text) && !chipHasThisEmp;
          if (chipHasThisEmp || (rowEmpMatches(n.employee) && !chipHasOtherEmp)) {
            const cleanText = chip.text.replace(stripRe, "").trim();
            results.push({ id: `${n.id}_c${idx}`, text: cleanText || chip.text, status: chip.status });
          }
        });
      } else {
        const textHit = n.content.toLowerCase().includes(searchStr);
        const empHit = rowEmpMatches(n.employee);
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

  const filteredEmployees = employees.filter(emp => !emp.name.toLowerCase().includes("fatima"));
  if (filteredEmployees.length === 0) return null;

  const activeEmployees = filteredEmployees
    .map(emp => ({ emp, tasks: getTasksForEmployee(emp.name) }))
    .filter(item => item.tasks.length > 0);

  if (activeEmployees.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sectionOpen ? 16 : 0 }}>
        <div
          onClick={() => setSectionOpen(!sectionOpen)}
          style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}
          title="Click dropdown chevron to toggle Employee Tasks"
        >
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "#78716C",
            }}
          >
            {sectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <Users size={13} color="#78716C" />
          <h3 style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "#78716C", margin: 0 }}>
            Employee Tasks
          </h3>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 10,
              background: "#F5F3FF",
              color: "#8B5CF6",
            }}
          >
            {activeEmployees.length}
          </span>
        </div>
      </div>

      {sectionOpen && (
        <>
          {activeEmployees.length === 0 ? (
            <div style={{ ...cardStyle, padding: "28px 16px", textAlign: "center", color: "#A8A29E" }}>
              <Users size={24} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <div style={{ fontSize: 12, fontWeight: 500 }}>No employee tasks assigned today.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeEmployees.map(({ emp, tasks }) => {
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
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8B5CF6", background: "#F5F3FF", padding: "2px 8px", borderRadius: 12 }}>
                        {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                      </span>
                    </button>

                    {/* Collapsible Tasks List */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #F0EEEC", background: "#FAFAF9", padding: "8px 12px" }}>
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Goals Overview Section Component (Displayed After Tracker) ─── */
interface GoalsOverviewSectionProps {
  goals: Goal[];
  cardStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  draggedGoal: string | null;
  setDraggedGoal: (id: string | null) => void;
  onNavigateToGoals: () => void;
  onAddGoal: (goal: Omit<Goal, "id">) => void;
  onUpdateGoal: (id: string, updates: Partial<Goal>) => void;
  onDeleteGoal: (id: string) => void;
  onReorderGoals: (newGoals: Goal[]) => void;
}

const GOAL_COLORS = ["#E1306C", "#2563EB", "#16A34A", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#EF4444"];

function MiniGoalRing({ pct, color, size = 36 }: { pct: number; color: string; size?: number }) {
  const visiblePct = pct > 0 ? Math.max(1, pct) : 0;
  const strokeWidth = 3.5;
  const r = (size - strokeWidth * 2) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (visiblePct / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F5F5F4" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <span style={{ fontSize: 9, fontWeight: 800, color: "#1C1917" }}>{pct}%</span>
    </div>
  );
}

function GoalsOverviewSection({
  goals,
  cardStyle,
  inputStyle,
  draggedGoal,
  setDraggedGoal,
  onNavigateToGoals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onReorderGoals,
}: GoalsOverviewSectionProps) {
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ title: "", target: "", current: "", unit: "", color: GOAL_COLORS[0] });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCurrent, setEditCurrent] = useState("");
  const [editTarget, setEditTarget] = useState("");

  const handleCreate = () => {
    if (!form.title.trim() || !form.target) return;
    onAddGoal({
      title: form.title.trim(),
      target: +form.target || 1,
      current: +(form.current || 0),
      unit: form.unit.trim() || "units",
      color: form.color || GOAL_COLORS[0],
    });
    setForm({ title: "", target: "", current: "", unit: "", color: GOAL_COLORS[0] });
    setShowAddForm(false);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    onUpdateGoal(id, {
      title: editTitle.trim(),
      current: +editCurrent || 0,
      target: +editTarget || 1,
    });
    setEditingId(null);
  };

  const completedCount = goals.filter((g) => g.current >= g.target).length;
  const inProgressCount = goals.length - completedCount;

  const filteredGoals = goals.filter((g) => {
    if (filter === "completed") return g.current >= g.target;
    if (filter === "in_progress") return g.current < g.target;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid #E7E5E4", paddingTop: 18, marginTop: 16 }}>
      {/* ── Top Header Toolbar matching Tracker ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: goalsOpen ? 4 : 0,
        }}
      >
        <div
          onClick={() => setGoalsOpen(!goalsOpen)}
          style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}
          title="Click dropdown chevron to toggle Goals"
        >
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "#78716C",
            }}
          >
            {goalsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <Target size={13} color="#2563EB" />
          <h3
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#78716C",
              margin: 0,
            }}
          >
            Goals
          </h3>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 10,
              background: "#EFF6FF",
              color: "#2563EB",
            }}
          >
            {goals.length}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Filter Dropdown */}
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as any);
              if (!goalsOpen) setGoalsOpen(true);
            }}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 7,
              border: "1px solid #E7E5E4",
              background: "#FAFAF9",
              color: "#1C1917",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All ({goals.length})</option>
            <option value="in_progress">In Progress ({inProgressCount})</option>
            <option value="completed">Completed ({completedCount})</option>
          </select>

          {!showAddForm && (
            <button
              onClick={() => {
                setGoalsOpen(true);
                setShowAddForm(true);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#2563EB",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
              title="Add a new goal"
            >
              <Plus size={12} /> Add
            </button>
          )}

          <button
            onClick={onNavigateToGoals}
            style={{
              background: "none",
              border: "none",
              color: "#78716C",
              cursor: "pointer",
              padding: "2px 4px",
              display: "flex",
              alignItems: "center",
            }}
            title="Open Goal Tracker page"
          >
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* ── Section Body ── */}
      {goalsOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Quick Add Goal Form */}
          {showAddForm && (
            <div
              style={{
                ...cardStyle,
                padding: 12,
                background: "#FAFAF9",
                border: "1.5px solid #DBEAFE",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#1E3A8A" }}>New Goal</span>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#78716C", padding: 0 }}
                >
                  <X size={13} />
                </button>
              </div>

              <input
                type="text"
                placeholder="Goal Title (e.g. YouTube Subscribers)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div>
                  <label style={{ fontSize: 9.5, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 2 }}>TARGET</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                    style={{ ...inputStyle, fontSize: 11, padding: "4px 6px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 9.5, fontWeight: 700, color: "#A8A29E", display: "block", marginBottom: 2 }}>CURRENT</label>
                  <input
                    type="number"
                    placeholder="e.g. 0"
                    value={form.current}
                    onChange={(e) => setForm({ ...form, current: e.target.value })}
                    style={{ ...inputStyle, fontSize: 11, padding: "4px 6px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Unit (e.g. $, followers)"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    style={{ ...inputStyle, fontSize: 11, padding: "4px 6px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {GOAL_COLORS.slice(0, 5).map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: c,
                        border: form.color === c ? `2px solid #1C1917` : "1px solid rgba(0,0,0,0.1)",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button
                  onClick={handleCreate}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 7,
                    border: "none",
                    background: "#2563EB",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Save Goal
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 7,
                    border: "1px solid #E7E5E4",
                    background: "#fff",
                    color: "#78716C",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Goal Cards List */}
          {filteredGoals.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "16px 0",
                color: "#A8A29E",
                border: "1px dashed #E7E5E4",
                borderRadius: 10,
              }}
            >
              <Target size={18} style={{ margin: "0 auto 4px", opacity: 0.4 }} />
              <p style={{ fontSize: 11, margin: 0 }}>
                {goals.length === 0 ? "No goals created yet." : "No goals match this filter."}
              </p>
            </div>
          ) : (
            filteredGoals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.current / goal.target) * 100)) || 0;
              const isEditing = editingId === goal.id;

              return (
                <div
                  key={goal.id}
                  draggable={!isEditing}
                  onDragStart={(e) => {
                    setDraggedGoal(goal.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedGoal && draggedGoal !== goal.id) {
                      const newGoals = [...goals];
                      const sIdx = newGoals.findIndex((g) => g.id === draggedGoal);
                      const tIdx = newGoals.findIndex((g) => g.id === goal.id);
                      if (sIdx !== -1 && tIdx !== -1) {
                        const [rem] = newGoals.splice(sIdx, 1);
                        newGoals.splice(tIdx, 0, rem);
                        onReorderGoals(newGoals);
                      }
                    }
                    setDraggedGoal(null);
                  }}
                  style={{
                    ...cardStyle,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    position: "relative",
                    opacity: draggedGoal === goal.id ? 0.4 : 1,
                    cursor: isEditing ? "default" : "grab",
                    transition: "box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const btns = e.currentTarget.querySelectorAll(".goal-action-btn") as NodeListOf<HTMLElement>;
                    btns.forEach((b) => { b.style.opacity = "1"; });
                  }}
                  onMouseLeave={(e) => {
                    const btns = e.currentTarget.querySelectorAll(".goal-action-btn") as NodeListOf<HTMLElement>;
                    btns.forEach((b) => { b.style.opacity = "0"; });
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Goal Title"
                        style={{ ...inputStyle, fontSize: 11, padding: "4px 6px" }}
                      />
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 9, color: "#A8A29E" }}>Current</label>
                          <input
                            type="number"
                            value={editCurrent}
                            onChange={(e) => setEditCurrent(e.target.value)}
                            style={{ ...inputStyle, fontSize: 11, padding: "3px 6px" }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 9, color: "#A8A29E" }}>Target</label>
                          <input
                            type="number"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                            style={{ ...inputStyle, fontSize: 11, padding: "3px 6px" }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 2 }}>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            padding: "3px 8px",
                            fontSize: 10,
                            background: "none",
                            border: "1px solid #E7E5E4",
                            borderRadius: 5,
                            cursor: "pointer",
                            color: "#78716C",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(goal.id)}
                          style={{
                            padding: "3px 10px",
                            fontSize: 10,
                            fontWeight: 600,
                            background: "#2563EB",
                            color: "#fff",
                            border: "none",
                            borderRadius: 5,
                            cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Top Row: Mini Ring + Title + Target Numbers */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        {/* Mini Circular Progress Ring */}
                        <MiniGoalRing pct={pct} color={goal.color || "#2563EB"} size={36} />

                        {/* Middle Info */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                            <span
                              onDoubleClick={() => {
                                setEditingId(goal.id);
                                setEditTitle(goal.title);
                                setEditCurrent(String(goal.current));
                                setEditTarget(String(goal.target));
                              }}
                              title="Double-click to edit goal"
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#1C1917",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                cursor: "pointer",
                              }}
                            >
                              {goal.title}
                            </span>

                            {/* Action Buttons (Edit, Quick +1, Delete) */}
                            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                              <button
                                onClick={() => {
                                  onUpdateGoal(goal.id, { current: goal.current + 1 });
                                }}
                                className="goal-action-btn"
                                style={{
                                  background: "#EFF6FF",
                                  border: "none",
                                  color: "#2563EB",
                                  opacity: 0,
                                  cursor: "pointer",
                                  padding: "2px 5px",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  transition: "opacity 0.1s",
                                }}
                                title="Add +1 to current"
                              >
                                +1
                              </button>

                              <button
                                onClick={() => {
                                  setEditingId(goal.id);
                                  setEditTitle(goal.title);
                                  setEditCurrent(String(goal.current));
                                  setEditTarget(String(goal.target));
                                }}
                                className="goal-action-btn"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#78716C",
                                  opacity: 0,
                                  cursor: "pointer",
                                  padding: 2,
                                  borderRadius: 4,
                                  transition: "opacity 0.1s",
                                }}
                                title="Edit goal"
                              >
                                <Pencil size={11} />
                              </button>

                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete goal "${goal.title}"?`)) {
                                    onDeleteGoal(goal.id);
                                  }
                                }}
                                className="goal-action-btn"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#EF4444",
                                  opacity: 0,
                                  cursor: "pointer",
                                  padding: 2,
                                  borderRadius: 4,
                                  transition: "opacity 0.1s",
                                }}
                                title="Delete goal"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          {/* Current / Target Numbers */}
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: goal.color || "#2563EB",
                                fontFamily: "'Fraunces', serif",
                              }}
                            >
                              {goal.unit === "$" ? `$${goal.current.toLocaleString()}` : goal.current.toLocaleString()}
                            </span>
                            <span style={{ fontSize: 10, color: "#A8A29E" }}>
                              / {goal.unit === "$" ? `$${goal.target.toLocaleString()}` : goal.target.toLocaleString()}
                            </span>
                            {goal.unit && goal.unit !== "units" && goal.unit !== "$" && (
                              <span style={{ fontSize: 9.5, color: "#78716C", fontWeight: 600, marginLeft: 2 }}>
                                {goal.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Linear Progress Bar */}
                      <div style={{ width: "100%", height: 4, borderRadius: 2, background: "#F5F5F4", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            background: goal.color || "#2563EB",
                            width: `${pct}%`,
                            borderRadius: 2,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
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

/* ─── Task Chip & Sub-tasks Syntax Parser ─── */
function parseTaskChip(input: string): TaskChip {
  const trimmed = input.trim();

  // Pattern 1: Events (Luma | MeetUp | WhatsApp) or Events (Luma, MeetUp)
  const parenMatch = trimmed.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const parentText = parenMatch[1].trim();
    const rawSub = parenMatch[2];
    const subItems = rawSub
      .split(/[|,/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (subItems.length > 0) {
      return {
        text: parentText,
        status: "not_started",
        subtasks: subItems.map((st) => ({
          id: "st_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          text: st,
          status: "not_started" as Status,
        })),
      };
    }
  }

  // Pattern 2: Events - Luma | MeetUp | WhatsApp (hyphen separating subtasks with pipe or comma)
  const hyphenMatch = trimmed.match(/^([^-]+)\s*-\s*([^|,\n]+(?:[|,].+))$/);
  if (hyphenMatch) {
    const parentText = hyphenMatch[1].trim();
    const rawSub = hyphenMatch[2];
    const subItems = rawSub
      .split(/[|,/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (subItems.length > 0) {
      return {
        text: parentText,
        status: "not_started",
        subtasks: subItems.map((st) => ({
          id: "st_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          text: st,
          status: "not_started" as Status,
        })),
      };
    }
  }

  // Pattern 3: Events: Luma | MeetUp | WhatsApp or Events: Luma, MeetUp
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx > 0 && colonIdx < trimmed.length - 1) {
    const parentText = trimmed.slice(0, colonIdx).trim();
    const rawSub = trimmed.slice(colonIdx + 1);
    const subItems = rawSub
      .split(/[|,/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (subItems.length > 0) {
      return {
        text: parentText,
        status: "not_started",
        subtasks: subItems.map((st) => ({
          id: "st_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          text: st,
          status: "not_started" as Status,
        })),
      };
    }
  }

  return {
    text: trimmed,
    status: "not_started",
  };
}

/* ─── Daily Todos ─── */

function DailyTodos({
  subTasks,
  managerNotes,
  pendingMeetingsCount,
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
  onToggleSubtask,
  onAddSubtaskToChip,
  onEditSubtask,
  onDeleteSubtask,
  mNote,
  setMNote,
  projects,
  employees,
}: {
  subTasks: SubTask[];
  managerNotes: ManagerNote[];
  pendingMeetingsCount: number;
  inp: React.CSSProperties;
  card: React.CSSProperties;
  onDoneForToday: () => void;
  onAddSub: (text: string, chips?: TaskChip[], employee?: string) => void;
  onAddSection: (name: string) => void;
  onEditSection: (id: string, name: string) => void;
  onCycleSub: (id: string) => void;
  onCycleSubChip: (id: string, chipIdx: number) => void;
  onDelSub: (id: string) => void;
  onAddNote: (text: string, chips?: TaskChip[], employee?: string) => void;
  onCycleNote: (id: string) => void;
  onCycleNoteChip: (id: string, chipIdx: number) => void;
  onDelNote: (id: string) => void;
  onReorderSubs: (from: number, to: number) => void;
  onReorderNotes: (from: number, to: number) => void;
  onEditEmployee: (id: string, list: "daily" | "manager", newEmployee: string) => void;
  onEditChip: (id: string, list: "daily" | "manager", chipIdx: number, newText: string) => void;
  onDeleteChip: (id: string, list: "daily" | "manager", chipIdx: number) => void;
  onAddChipToRow: (id: string, list: "daily" | "manager", chip: TaskChip) => void;
  onToggleSubtask: (id: string, list: "daily" | "manager", chipIdx: number, subtaskIdx: number) => void;
  onAddSubtaskToChip: (id: string, list: "daily" | "manager", chipIdx: number, text: string) => void;
  onEditSubtask: (id: string, list: "daily" | "manager", chipIdx: number, subtaskIdx: number, text: string) => void;
  onDeleteSubtask: (id: string, list: "daily" | "manager", chipIdx: number, subtaskIdx: number) => void;
  mNote: string;
  setMNote: (v: string) => void;
  projects: Project[];
  employees: Employee[];
}) {
  const [todoTab, setTodoTab] = useState<"daily" | "manager">("daily");
  const [taskInput, setTaskInput] = useState("");
  const [personInput, setPersonInput] = useState("");
  const [pendingChips, setPendingChips] = useState<TaskChip[]>([]);
  const [openSubtaskPopover, setOpenSubtaskPopover] = useState<{ id: string; chipIdx: number } | null>(null);
  const [popoverNewSubText, setPopoverNewSubText] = useState("");
  const [editingSubtask, setEditingSubtask] = useState<{ id: string; chipIdx: number; subIdx: number } | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  // Section heading state
  const [addingSection, setAddingSection] = useState(false);
  const [sectionInput, setSectionInput] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionText, setEditingSectionText] = useState("");

  // Close subtask popover on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target as Node) &&
        !target?.closest("[data-subtask-trigger]")
      ) {
        setOpenSubtaskPopover(null);
      }
    };
    if (openSubtaskPopover) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [openSubtaskPopover]);

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
    const parsed = parseTaskChip(raw);
    setPendingChips(p => [...p, parsed]);
    setTaskInput("");
  };

  const removeChip = (idx: number) => setPendingChips(p => p.filter((_, i) => i !== idx));

  const handleAdd = () => {
    const rawTask = taskInput.trim();
    const chips: TaskChip[] = [...pendingChips];

    if (rawTask) {
      chips.push(parseTaskChip(rawTask));
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
    if (newChipText.trim()) {
      const parsed = parseTaskChip(newChipText.trim());
      onAddChipToRow(id, todoTab, parsed);
    }
    setAddingChipTo(null);
    setNewChipText("");
  };

  // "Done For Today" carries forward any item that isn't done yet (not just "doing") —
  // this count must match that scope, or the button hides while carryable work still exists.
  const pendingCount = subTasks.filter(s => !s.isSection && s.status !== "done").length
    + pendingMeetingsCount;

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
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
            color: "#1C1917",
            borderBottom: "2px solid #2563EB",
            padding: "0 8px 6px",
          }}>
            Zain&apos;s Todos
          </div>
          {addingSection ? (
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
          )}
        </div>
        {pendingCount > 0 && (
          <button
            onClick={onDoneForToday}
            title={`Carry ${pendingCount} pending item${pendingCount > 1 ? 's' : ''} to tomorrow`}
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
            <span style={{ background: "#F5F5F4", color: "#78716C", borderRadius: 10, padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>{pendingCount}</span>
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
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#2563EB" }}>
              <span>{chip.text}</span>
              {chip.subtasks && chip.subtasks.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: "#DBEAFE", color: "#1E40AF", borderRadius: 10, padding: "1px 6px" }}>
                  {chip.subtasks.length} subs
                </span>
              )}
              <button onClick={() => removeChip(i)} style={{ color: "#93C5FD", fontSize: 14, lineHeight: 1, paddingLeft: 2, background: "none", border: "none", cursor: "pointer" }}>×</button>
            </div>
          ))}

          {/* ── Task Input with @ Employee mention ── */}
          <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
            <input
              ref={taskInputRef}
              type="text"
              placeholder="Assign Task… e.g. Events (Luma | MeetUp | WhatsApp) or type @"
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
            const chips = (item as any).chips as TaskChip[] | undefined;
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
                  zIndex: openSubtaskPopover?.id === item.id ? 50 : undefined,
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
                      const hasSubtasks = !!(chip.subtasks && chip.subtasks.length > 0);
                      const totalSub = hasSubtasks ? chip.subtasks!.length : 0;
                      const doneSub = hasSubtasks ? chip.subtasks!.filter((st) => st.status === "done").length : 0;
                      const doingSub = hasSubtasks ? chip.subtasks!.filter((st) => st.status === "doing").length : 0;
                      const effectiveStatus: Status = chip.status || "not_started";
                      const cs = chipStatusColor[effectiveStatus];
                      const isEditingThis = editingChip?.id === item.id && editingChip?.idx === idx;
                      const isOpenPopover = openSubtaskPopover?.id === item.id && openSubtaskPopover?.chipIdx === idx;

                      return (
                        <div key={idx} style={{ position: "relative", display: "inline-flex", alignItems: "stretch", zIndex: isOpenPopover ? 60 : undefined }}>
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
                              <div
                                data-subtask-trigger="true"
                                onClick={() => {
                                  if (hasSubtasks) {
                                    setOpenSubtaskPopover(isOpenPopover ? null : { id: item.id, chipIdx: idx });
                                  } else {
                                    todoTab === "daily" ? onCycleSubChip(item.id, idx) : onCycleNoteChip(item.id, idx);
                                  }
                                }}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  background: cs.bg, border: `1px solid ${cs.border}`,
                                  borderRadius: "20px 0 0 20px", padding: "4px 8px 4px 10px",
                                  fontSize: 12, fontWeight: 600, color: cs.text,
                                  cursor: "pointer", transition: "all 0.2s", userSelect: "none",
                                }}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    todoTab === "daily" ? onCycleSubChip(item.id, idx) : onCycleNoteChip(item.id, idx);
                                  }}
                                  title="Click to cycle: Not Started ➔ Doing ➔ Done"
                                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                                >
                                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: cs.dot, flexShrink: 0, ...(effectiveStatus === "done" ? { boxShadow: `0 0 0 2px ${cs.dot}40` } : effectiveStatus === "doing" ? { boxShadow: `0 0 0 2px ${cs.dot}40` } : {}) }} />
                                </button>
                                <span
                                  style={{ textDecoration: effectiveStatus === "done" ? "line-through" : "none" }}
                                  onDoubleClick={(e) => { e.stopPropagation(); setEditingChip({ id: item.id, idx }); setEditingChipText(chip.text); }}
                                  title="Double-click to rename"
                                >
                                  {chip.text}
                                </span>
                                {hasSubtasks ? (
                                  <span
                                    style={{
                                      display: "inline-flex", alignItems: "center", gap: 2,
                                      fontSize: 10, fontWeight: 700,
                                      background: effectiveStatus === "done" ? "#DCFCE7" : "#E2E8F0",
                                      color: effectiveStatus === "done" ? "#15803D" : "#475569",
                                      padding: "1px 5px", borderRadius: 8, marginLeft: 2,
                                    }}
                                  >
                                    {doneSub}/{totalSub}
                                    <ChevronDown size={10} style={{ transform: isOpenPopover ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                                  </span>
                                ) : (
                                  <button
                                    data-subtask-trigger="true"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenSubtaskPopover(isOpenPopover ? null : { id: item.id, chipIdx: idx });
                                    }}
                                    title="Add sub-tasks to this item"
                                    style={{
                                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                                      border: "none", background: "rgba(0,0,0,0.05)",
                                      padding: "2px 4px", cursor: "pointer", color: cs.text,
                                      borderRadius: 6, marginLeft: 3, transition: "all 0.15s",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(0,0,0,0.12)";
                                      e.currentTarget.style.color = "#1E40AF";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                                      e.currentTarget.style.color = cs.text;
                                    }}
                                  >
                                    <Plus size={10} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
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

                          {/* ── Subtask Popover Drawer ── */}
                          {isOpenPopover && (
                            <div
                              ref={popoverRef}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                top: "calc(100% + 6px)",
                                left: 0,
                                zIndex: 300,
                                minWidth: 230,
                                maxWidth: 320,
                                background: "#FFFFFF",
                                borderRadius: 12,
                                border: "1px solid #E5E7EB",
                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
                                padding: "10px 12px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              {/* Popover Header */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6", paddingBottom: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1F2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {chip.text}
                                  </span>
                                  {totalSub > 0 && (
                                    <span style={{ fontSize: 10, fontWeight: 700, background: cs.bg, color: cs.text, border: `1px solid ${cs.border}`, borderRadius: 10, padding: "1px 6px", flexShrink: 0 }}>
                                      {doneSub}/{totalSub}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => setOpenSubtaskPopover(null)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 2, display: "flex", flexShrink: 0 }}
                                >
                                  <X size={13} />
                                </button>
                              </div>

                              {/* Subtasks List */}
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                                {totalSub === 0 && (
                                  <div style={{ fontSize: 11, color: "#9CA3AF", padding: "4px 2px", fontStyle: "italic" }}>
                                    No sub-tasks yet. Add one below:
                                  </div>
                                )}
                                {(chip.subtasks || []).map((st, sIdx) => {
                                  const isStDone = st.status === "done";
                                  const isStDoing = st.status === "doing";
                                  const isEditingThisSt = editingSubtask?.id === item.id && editingSubtask?.chipIdx === idx && editingSubtask?.subIdx === sIdx;

                                  return (
                                    <div
                                      key={st.id || sIdx}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "4px 6px",
                                        borderRadius: 6,
                                        background: isStDone ? "#F0FDF4" : isStDoing ? "#FFFBEB" : "transparent",
                                        transition: "background 0.1s",
                                      }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                                        <button
                                          onClick={() => onToggleSubtask(item.id, todoTab, idx, sIdx)}
                                          title={`Status: ${SLABEL[st.status || "not_started"]}. Click to cycle: Not Started ➔ Doing ➔ Done`}
                                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}
                                        >
                                          {isStDone ? (
                                            <CheckCircle2 size={14} color="#16A34A" />
                                          ) : isStDoing ? (
                                            <Circle size={14} color="#F59E0B" fill="#F59E0B" />
                                          ) : (
                                            <Circle size={14} color="#D1D5DB" />
                                          )}
                                        </button>
                                        {isEditingThisSt ? (
                                          <input
                                            autoFocus
                                            value={editingSubtaskText}
                                            onChange={(e) => setEditingSubtaskText(e.target.value)}
                                            onBlur={() => {
                                              if (editingSubtaskText.trim()) {
                                                onEditSubtask(item.id, todoTab, idx, sIdx, editingSubtaskText.trim());
                                              }
                                              setEditingSubtask(null);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                if (editingSubtaskText.trim()) {
                                                  onEditSubtask(item.id, todoTab, idx, sIdx, editingSubtaskText.trim());
                                                }
                                                setEditingSubtask(null);
                                              }
                                              if (e.key === "Escape") setEditingSubtask(null);
                                            }}
                                            style={{
                                              fontSize: 12,
                                              fontWeight: 500,
                                              padding: "1px 4px",
                                              borderRadius: 4,
                                              border: "1px solid #2563EB",
                                              outline: "none",
                                              width: "100%",
                                            }}
                                          />
                                        ) : (
                                          <span
                                            onDoubleClick={() => {
                                              setEditingSubtask({ id: item.id, chipIdx: idx, subIdx: sIdx });
                                              setEditingSubtaskText(st.text);
                                            }}
                                            title="Double-click to rename"
                                            style={{
                                              fontSize: 12,
                                              fontWeight: 500,
                                              color: isStDone ? "#9CA3AF" : "#374151",
                                              textDecoration: isStDone ? "line-through" : "none",
                                              cursor: "pointer",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {st.text}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => onDeleteSubtask(item.id, todoTab, idx, sIdx)}
                                        title="Delete sub-task"
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "#D1D5DB",
                                          cursor: "pointer",
                                          padding: "2px 4px",
                                          fontSize: 12,
                                          lineHeight: 1,
                                          borderRadius: 4,
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = "#D1D5DB")}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Inline Add Subtask Input */}
                              <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 6 }}>
                                <input
                                  placeholder="+ Add sub-task (Enter to save)"
                                  value={openSubtaskPopover?.id === item.id && openSubtaskPopover?.chipIdx === idx ? popoverNewSubText : ""}
                                  onChange={(e) => setPopoverNewSubText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && popoverNewSubText.trim()) {
                                      e.preventDefault();
                                      onAddSubtaskToChip(item.id, todoTab, idx, popoverNewSubText.trim());
                                      setPopoverNewSubText("");
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    fontSize: 11,
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    border: "1px solid #E5E7EB",
                                    outline: "none",
                                    background: "#FAFAFA",
                                  }}
                                />
                              </div>
                            </div>
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
