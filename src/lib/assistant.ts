/* ─────────────────────────────────────────────────────────────────────────────
   AI assistant: the model turns a plain-English instruction into a list of
   actions; applyAssistantActions applies them to AppState in the browser, so
   every change goes through the normal save (with Undo).
   ───────────────────────────────────────────────────────────────────────────── */
import { AppState, ContentIdea, ContentPlatform, EventCategory, EventItem, Meeting, Priority, PriorityCategory, SubTask } from "./types";
import { createDayData, to12h } from "./stateUtils";

export type AssistantActionType =
  | "add_task"
  | "add_meeting"
  | "add_event"
  | "add_priority"
  | "add_note"
  | "add_content_idea";

export interface AssistantAction {
  type: AssistantActionType;
  date?: string;      // YYYY-MM-DD
  time?: string;      // HH:mm (24h)
  title?: string;     // event / content idea / meeting title
  text?: string;      // task text, priority name or note text
  group?: string;     // task card (@SIXTY), priority category, or note target
  project?: string;   // meeting project
  people?: string[];  // meeting attendees
  location?: string;
  category?: string;  // event category: Ours | Others | Imp
  weekly?: boolean;
  platform?: string;  // Instagram | YouTube | LinkedIn
  link?: string;
}

export interface AssistantContext {
  today: string;          // YYYY-MM-DD in the user's timezone
  weekday: string;
  viewingDate: string;
  taskGroups: string[];   // @groups on the viewed day's task cards
  priorityCategories: { name: string; items: string[] }[];
  projects: string[];
  employees: string[];
}

export function buildAssistantContext(state: AppState): AssistantContext {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const day = state.days[state.currentDate];
  const groups = new Set<string>();
  for (const s of day?.subTasks || []) if (!s.isSection && s.employee) groups.add(s.employee.replace(/^@/, ""));
  const cats = state.priorityCategories || [];
  return {
    today,
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    viewingDate: state.currentDate,
    taskGroups: [...groups],
    priorityCategories: cats.map((c) => ({
      name: c.name,
      items: (state.priorities || []).filter((p) => p.categoryId === c.id).map((p) => p.text),
    })),
    projects: (state.projects || []).map((p) => p.name),
    employees: (state.employees || []).map((e) => e.name),
  };
}

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const norm = (s?: string) => (s || "").replace(/^@/, "").trim().toLowerCase();
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const CAT_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DB2777", "#0891B2", "#DC2626", "#4B5563"];
const PLATFORMS: ContentPlatform[] = ["Instagram", "YouTube", "LinkedIn"];
const FIRST_FORMAT: Record<string, ContentIdea["format"]> = { Instagram: "Reel", YouTube: "Short", LinkedIn: "Post" };

/** Applies actions to a copy of state. Returns the new state and a line per change. */
export function applyAssistantActions(state: AppState, actions: AssistantAction[]): { state: AppState; done: string[] } {
  let s: AppState = { ...state, days: { ...state.days } };
  const done: string[] = [];

  const dayFor = (date: string) => {
    const d = s.days[date] || createDayData(date);
    s.days[date] = { ...d, subTasks: [...(d.subTasks || [])], meetings: [...(d.meetings || [])], events: [...(d.events || [])] };
    return s.days[date];
  };
  const prettyDate = (date: string) =>
    date === state.currentDate ? "" : ` on ${new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;

  for (const a of actions) {
    const date = isDate(a.date) ? a.date! : state.currentDate;
    try {
      switch (a.type) {
        case "add_task": {
          const text = (a.text || a.title || "").trim();
          if (!text) break;
          const group = (a.group || "").replace(/^@/, "").trim();
          const day = dayFor(date);
          const idx = group ? day.subTasks.findIndex((t) => !t.isSection && norm(t.employee) === norm(group) && (t.chips?.length || 0) > 0) : -1;
          const chip = { id: uid("chip"), text, status: "not_started" as const };
          if (idx !== -1) {
            const card = day.subTasks[idx];
            day.subTasks[idx] = { ...card, chips: [...(card.chips || []), chip] };
          } else {
            const card: SubTask = { id: uid("t"), parentId: "", text, status: "not_started", employee: group || undefined, chips: [chip] };
            day.subTasks.push(card);
          }
          done.push(`Task “${text}”${group ? ` → @${group}` : ""}${prettyDate(date)}`);
          break;
        }
        case "add_meeting": {
          const title = (a.project || a.title || a.text || "").trim();
          if (!title) break;
          const m: Meeting = {
            id: uid("meet"),
            projectId: title,
            employeeIds: (a.people || []).map((p) => p.trim()).filter(Boolean),
            time: to12h(a.time) || "Scheduled",
            date,
            status: "not_started",
          };
          dayFor(date).meetings!.push(m);
          done.push(`Meeting “${title}”${a.time ? ` at ${to12h(a.time)}` : ""}${prettyDate(date) || " today"}`);
          break;
        }
        case "add_event": {
          const title = (a.title || a.text || "").trim();
          if (!title) break;
          const cat: EventCategory = (["Ours", "Others", "Imp"] as const).find((c) => norm(c) === norm(a.category)) || "Ours";
          const ev: EventItem = {
            id: uid("event"),
            title,
            category: cat,
            time: to12h(a.time) || undefined,
            location: a.location || undefined,
            date,
            recurrence: a.weekly ? "weekly" : "one_time",
            recurringDay: a.weekly ? new Date(date + "T12:00:00").getDay() : undefined,
            status: "not_started",
          };
          dayFor(date).events!.push(ev);
          if (a.weekly) s.recurringEvents = [...(s.recurringEvents || []), ev];
          done.push(`Event “${title}”${a.time ? ` at ${to12h(a.time)}` : ""}${prettyDate(date) || " today"}${a.weekly ? " (weekly)" : ""}`);
          break;
        }
        case "add_priority": {
          const name = (a.text || a.title || "").trim();
          const catName = (a.group || a.category || "").trim();
          if (!name || !catName) break;
          let cats: PriorityCategory[] = [...(s.priorityCategories || [])];
          let cat = cats.find((c) => norm(c.name) === norm(catName));
          if (!cat) {
            cat = { id: uid("pc"), name: catName, color: CAT_COLORS[cats.length % CAT_COLORS.length] };
            cats = [...cats, cat];
          }
          const p: Priority = { id: uid("p"), text: name, categoryId: cat.id, status: "not_started", touchedAt: new Date().toISOString() };
          s = { ...s, priorityCategories: cats, priorities: [...(s.priorities || []), p] };
          done.push(`Priority “${name}” → ${cat.name}`);
          break;
        }
        case "add_note": {
          const text = (a.text || "").trim();
          const target = norm(a.group || a.title);
          if (!text || !target) break;
          const stamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const line = `${stamp}: ${text}`;
          const pIdx = (s.priorities || []).findIndex((p) => norm(p.text) === target);
          if (pIdx !== -1) {
            const list = [...(s.priorities || [])];
            const p = list[pIdx];
            list[pIdx] = { ...p, notes: p.notes ? `${p.notes}\n${line}` : line, touchedAt: new Date().toISOString() };
            s = { ...s, priorities: list };
            done.push(`Note added to ${p.text}`);
            break;
          }
          const day = dayFor(state.currentDate);
          const cIdx = day.subTasks.findIndex((t) => !t.isSection && norm(t.employee) === target);
          if (cIdx !== -1) {
            const c = day.subTasks[cIdx];
            day.subTasks[cIdx] = { ...c, notes: c.notes ? `${c.notes}\n${line}` : line };
            done.push(`Note added to @${c.employee}`);
          }
          break;
        }
        case "add_content_idea": {
          const title = (a.title || a.text || "").trim();
          if (!title && !a.link) break;
          const platform = PLATFORMS.find((p) => norm(p) === norm(a.platform)) || "Instagram";
          const idea: ContentIdea = {
            id: uid("ci"),
            title: title || "Idea from link",
            platform,
            format: FIRST_FORMAT[platform],
            stage: "idea",
            links: a.link ? [{ id: uid("l"), label: "Reference", url: a.link }] : [],
            createdAt: Date.now(),
          };
          s = { ...s, contentIdeas: [...(s.contentIdeas || []), idea] };
          done.push(`${platform} idea “${idea.title}”`);
          break;
        }
      }
    } catch {
      /* skip a malformed action, keep the rest */
    }
  }
  return { state: s, done };
}
