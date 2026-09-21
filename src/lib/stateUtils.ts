import { AppState, DayData, MainTask } from "./types";

const defaultMainTasks = (): MainTask[] => [
  { id: "sleep", category: "Mandatory", name: "Sleep", status: "not_started", from: "01:00", to: "07:00", goalLink: "" },
  { id: "workout", category: "Mandatory", name: "Workout", status: "not_started", from: "07:30", to: "09:30", goalLink: "" },
  { id: "devmate", category: "Company", name: "Devmate Tasks", status: "not_started", from: "10:30", to: "14:30", goalLink: "" },
  { id: "content", category: "Misc", name: "Content Creation", status: "not_started", from: "14:30", to: "16:00", goalLink: "" },
  { id: "learning", category: "Misc", name: "Learning", status: "not_started", from: "16:00", to: "17:30", goalLink: "" },
];

export const getToday = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function createDayData(date: string): DayData {
  return {
    date,
    mainTasks: defaultMainTasks(),
    subTasks: [],
    rating: 0,
    managerNotes: [],
    meetings: [],
    events: [],
  };
}

export const DEFAULT_GOALS = [
  { id: "g1", title: "Instagram Followers", target: 5000, current: 1200, unit: "followers", color: "#E1306C" },
  { id: "g2", title: "AI Course Sales", target: 5000, current: 0, unit: "sales", color: "#2563EB" },
  { id: "g3", title: "App Sales", target: 5000, current: 0, unit: "sales", color: "#16A34A" },
  { id: "g4", title: "Revenue Target", target: 1000000, current: 0, unit: "$", color: "#F59E0B" },
];

export function cleanStateOfFatima(parsed: AppState): AppState {
  if (parsed.employees) {
    parsed.employees = parsed.employees.filter((e) => !e.name.toLowerCase().includes("fatima"));
  }
  if (parsed.days) {
    for (const d of Object.values(parsed.days)) {
      if (d.subTasks) {
        d.subTasks = d.subTasks.map((s) => ({
          ...s,
          employee: s.employee && s.employee.toLowerCase().includes("fatima") ? undefined : s.employee,
          text: s.text ? s.text.replace(/@fatima\b/gi, "").trim() : s.text,
          chips: s.chips
            ? s.chips.map((c) => ({
                ...c,
                text: c.text.replace(/@fatima\b/gi, "").trim(),
              }))
            : s.chips,
        }));
      }
    }
  }
  return parsed;
}

export function createEmptyState(): AppState {
  const td = getToday();
  return {
    currentDate: td,
    days: { [td]: createDayData(td) },
    goals: [...DEFAULT_GOALS],
    streaks: { sleep: 0, workout: 0 },
    categoryLabels: { Mandatory: "Mandatory", Company: "Company Tasks", Misc: "Misc" },
    appTrackers: [],
    projectResources: [],
    contentPostedDates: [],
    projects: [],
    employees: [],
    recurringEvents: [],
  };
}

/**
 * Applies the same defaulting/seeding rules the client applies on load
 * (ensure today's day exists, seed defaults for fields added after older
 * saves, strip stale Fatima references) so any consumer of stored state
 * — the frontend or the MCP server — sees a consistent shape.
 */
export function normalizeState(parsed: AppState): AppState {
  const td = getToday();
  if (!parsed.days[td]) {
    parsed.days[td] = createDayData(td);
  }
  parsed.currentDate = td;
  if (!parsed.goals || parsed.goals.length === 0) {
    parsed.goals = [...DEFAULT_GOALS];
  }
  if (!parsed.categoryLabels) {
    parsed.categoryLabels = { Mandatory: "Mandatory", Company: "Company Tasks", Misc: "Misc" };
  }
  if (!parsed.appTrackers) parsed.appTrackers = [];
  if (!parsed.projectResources) parsed.projectResources = [];
  if (!parsed.contentPostedDates) parsed.contentPostedDates = [];
  if (!parsed.projects) parsed.projects = [];
  if (!parsed.employees) parsed.employees = [];
  if (!parsed.recurringEvents) parsed.recurringEvents = [];
  return cleanStateOfFatima(parsed);
}
