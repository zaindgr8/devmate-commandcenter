import { AppState, DayData, MainTask } from "./types";
import { supabase } from "./supabase";
import { getToday, createDayData, DEFAULT_GOALS, cleanStateOfFatima, createEmptyState, normalizeState } from "./stateUtils";

export { getToday, createDayData };

const STORAGE_KEY = "devmate_command_center";

export async function loadState(): Promise<AppState> {
  if (typeof window === "undefined") {
    const td = getToday();
    return { currentDate: td, days: {}, goals: [...DEFAULT_GOALS], streaks: {}, categoryLabels: { Mandatory: "Mandatory", Company: "Company Tasks", Misc: "Misc" }, appTrackers: [] };
  }
  
  try {
    const res = await fetch("/api/state");
    const parsed = await res.json();
    if (parsed) {
      const td = getToday();
      if (!parsed.days[td]) {
        parsed.days[td] = createDayData(td);
      }
      parsed.currentDate = td;
      // Only seed defaults if no goals have been saved yet; otherwise preserve all user edits
      if (!parsed.goals || parsed.goals.length === 0) {
        parsed.goals = [...DEFAULT_GOALS];
      }
      if (!parsed.categoryLabels) {
        parsed.categoryLabels = { Mandatory: "Mandatory", Company: "Company Tasks", Misc: "Misc" };
      }
      if (!parsed.appTrackers) {
        parsed.appTrackers = [];
      }
      if (!parsed.projectResources) {
        parsed.projectResources = [];
      }
      if (!parsed.contentPostedDates) {
        parsed.contentPostedDates = [];
      }
      if (!parsed.projects) {
        parsed.projects = [];
      }
      if (!parsed.employees) {
        parsed.employees = [];
      }
      if (!parsed.recurringEvents) {
        parsed.recurringEvents = [];
      }
      return cleanStateOfFatima(parsed);
    }
  } catch(err) {
    console.error("Failed to load from DB", err);
  }

  // Fallback to localStorage migration
  try {
     const raw = localStorage.getItem(STORAGE_KEY);
     if (raw) {
       const parsed = JSON.parse(raw) as AppState;
       const td = getToday();
       if (!parsed.days[td]) {
         parsed.days[td] = createDayData(td);
       }
       parsed.currentDate = td;
       // Only seed defaults if no goals have been saved yet; otherwise preserve all user edits
       if (!parsed.goals || parsed.goals.length === 0) {
         parsed.goals = [...DEFAULT_GOALS];
       }
       if (!parsed.categoryLabels) {
         parsed.categoryLabels = { Mandatory: "Mandatory", Company: "Company Tasks", Misc: "Misc" };
       }
       if (!parsed.appTrackers) {
         parsed.appTrackers = [];
       }
       if (!parsed.projectResources) {
         parsed.projectResources = [];
       }
       if (!parsed.contentPostedDates) {
         parsed.contentPostedDates = [];
       }
       if (!parsed.projects) {
         parsed.projects = [];
       }
       if (!parsed.employees) {
         parsed.employees = [];
       }
       if (!parsed.recurringEvents) {
         parsed.recurringEvents = [];
       }
       const cleaned = cleanStateOfFatima(parsed);
       saveState(cleaned);
       return cleaned;
     }
  } catch {}

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

// Debounce timer — only flush to Supabase after 1.5s of inactivity
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingState: AppState | null = null;

async function sendToDb(state: AppState, keepalive = false) {
  try {
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
      keepalive,
    });
    _pendingState = null;
  } catch (err) {
    console.error("Failed to save to DB", err);
  }
}

if (typeof window !== "undefined") {
  // Ensure any pending edits are pushed to DB even if user immediately leaves or refreshes
  window.addEventListener("beforeunload", () => {
    if (_pendingState) {
      sendToDb(_pendingState, true);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && _pendingState) {
      sendToDb(_pendingState, true);
    }
  });
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;

  _pendingState = state;

  // Write to localStorage immediately for instant local feedback
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}

  // Debounce the network write to Supabase
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    sendToDb(state);
  }, 1500);
}

// Auth
const AUTH_KEY = "devmate_auth";

export function getSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name) {
        parsed.name = parsed.name.replace(/(\s*(&|and)\s*Fatima|Fatima\s*(&|and)?\s*)/gi, "").trim() || "Zain";
        localStorage.setItem(AUTH_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch {}
  return null;
}

export async function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY);
  }
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }
}

// Streak calculation
export function calculateStreaks(days: Record<string, DayData>): Record<string, number> {
  const streaks: Record<string, number> = {};
  const mandatoryIds = ["sleep", "workout"];
  const sortedDates = Object.keys(days).sort().reverse();

  for (const taskId of mandatoryIds) {
    let count = 0;
    for (const date of sortedDates) {
      const day = days[date];
      const task = day.mainTasks.find((t) => t.id === taskId);
      if (task && task.status === "done") {
        count++;
      } else {
        break;
      }
    }
    streaks[taskId] = count;
  }
  return streaks;
}
