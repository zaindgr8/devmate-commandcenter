import { AppState, DayData, MainTask } from "./types";
import { supabase } from "./supabase";
import { getToday, createDayData, DEFAULT_GOALS, cleanStateOfFatima, createEmptyState, normalizeState } from "./stateUtils";

export { getToday, createDayData };

const STORAGE_KEY = "devmate_command_center";

// Revision of the server copy this tab is based on (see /api/state POST).
// undefined = unknown (e.g. after a hot reload) -> server accepts the write as before.
let _rev: number | undefined;

export const STATE_CONFLICT_EVENT = "devmate:state-conflict";
export const STATE_REFRESHED_EVENT = "devmate:state-refreshed";
export const AUTH_REQUIRED_EVENT = "devmate:auth-required";

// ── Auth for /api/state: every request carries the Supabase access token ──
let _token: string | null = null;

if (typeof window !== "undefined" && supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    _token = session?.access_token ?? null;
  });
}

async function authHeaders(): Promise<Record<string, string>> {
  if (supabase) {
    try {
      // getSession refreshes an expired access token using the stored refresh token.
      const { data } = await supabase.auth.getSession();
      _token = data.session?.access_token ?? null;
    } catch {}
  }
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}

/** True if the browser still holds a Supabase session (used on page load). */
export async function hasSupabaseSession(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    _token = data.session?.access_token ?? null;
    return !!data.session;
  } catch {
    return false;
  }
}

function isAuthFailure(res: Response) {
  if (res.status === 401 || res.status === 403) {
    window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
    return true;
  }
  return false;
}

function readCache(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

export async function loadState(): Promise<AppState> {
  if (typeof window === "undefined") {
    const td = getToday();
    return { currentDate: td, days: {}, goals: [...DEFAULT_GOALS], streaks: {}, categoryLabels: { Mandatory: "Mandatory", Company: "Company Tasks", Misc: "Misc" }, appTrackers: [] };
  }
  
  try {
    const res = await fetch("/api/state", { cache: "no-store", headers: await authHeaders() });
    if (isAuthFailure(res) || !res.ok) {
      // Couldn't read the real data (signed out, or a server/database error).
      // Show the cached copy but make sure this tab can't overwrite the server:
      // revision -1 never matches, so any save is refused and replaced with the real data.
      _rev = -1;
      return readCache() || createEmptyState();
    }
    const parsed = await res.json();
    if (parsed) {
      _rev = typeof parsed._rev === "number" ? parsed._rev : 0;
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
    // Network failure: same rule as above, never let the cached copy overwrite the server.
    console.error("Failed to load from DB", err);
    _rev = -1;
    return readCache() || createEmptyState();
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

// Saves from this tab run one after another, so a slow save can't make the next
// one look stale to the server and conflict with this tab's own write.
let _queue: Promise<void> = Promise.resolve();

function sendToDb(state: AppState, keepalive = false): Promise<void> {
  if (keepalive) {
    // Page is closing: we can't wait for the queue. Send without a revision so this
    // tab's latest edits are written rather than refused.
    try {
      fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(_token ? { Authorization: `Bearer ${_token}` } : {}) },
        // A tab that never loaded the server copy (_rev -1) keeps its revision so it can't overwrite.
        body: JSON.stringify({ ...state, _rev: _rev === -1 ? -1 : undefined }),
        keepalive: true,
      });
    } catch {}
    _pendingState = null;
    return Promise.resolve();
  }
  _queue = _queue.then(() => doSend(state));
  return _queue;
}

async function doSend(state: AppState) {
  try {
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ ...state, _rev }),
    });
    if (isAuthFailure(res)) return; // edits stay in this browser's cache; user is sent to sign in
    if (res.status === 409) {
      // Another tab/device saved newer data. Don't overwrite it: adopt it and tell the UI.
      const body = await res.json().catch(() => null);
      // Drop any queued write built on the stale copy.
      if (_saveTimer) clearTimeout(_saveTimer);
      _saveTimer = null;
      _pendingState = null;
      if (body?.state) {
        _rev = typeof body.rev === "number" ? body.rev : _rev;
        const latest = normalizeState(body.state as AppState);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(latest)); } catch {}
        window.dispatchEvent(new CustomEvent(STATE_CONFLICT_EVENT, { detail: latest }));
      }
      return;
    }
    if (res.ok) {
      const body = await res.json().catch(() => null);
      if (typeof body?.rev === "number") _rev = body.rev;
    }
    if (_pendingState === state) _pendingState = null;
  } catch (err) {
    console.error("Failed to save to DB", err);
  }
}

/**
 * Pull the latest server copy if it changed since this tab loaded it and this tab
 * has nothing unsaved. Called when the tab regains focus so a portal left open in
 * one tab picks up edits made in another tab or on another device.
 */
export async function refreshIfStale() {
  if (typeof window === "undefined" || _pendingState || _rev === undefined) return;
  // _rev === -1 (load failed earlier) also gets here, so the real data is picked up once reachable.
  try {
    const res = await fetch("/api/state", { cache: "no-store", headers: await authHeaders() });
    if (isAuthFailure(res) || !res.ok) return;
    const parsed = await res.json();
    if (!parsed || _pendingState) return;
    const serverRev = typeof parsed._rev === "number" ? parsed._rev : 0;
    if (serverRev === _rev) return;
    _rev = serverRev;
    const latest = normalizeState(parsed as AppState);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(latest)); } catch {}
    window.dispatchEvent(new CustomEvent(STATE_REFRESHED_EVENT, { detail: latest }));
  } catch {}
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
      // Switching tabs: the page stays alive, so flush through the normal
      // (revision-checked) queue instead of the forced close-time send.
      if (_saveTimer) clearTimeout(_saveTimer);
      _saveTimer = null;
      sendToDb(_pendingState);
    } else if (document.visibilityState === "visible") {
      refreshIfStale();
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
  const today = getToday();
  // Future days (created by "Done For Today" or by browsing ahead) must not break the streak.
  const sortedDates = Object.keys(days).filter((d) => d <= today).sort().reverse();

  for (const taskId of mandatoryIds) {
    let count = 0;
    for (const date of sortedDates) {
      const day = days[date];
      const task = day.mainTasks.find((t) => t.id === taskId);
      if (task && task.status === "done") {
        count++;
      } else if (date === today) {
        // Today isn't over yet: not done so far doesn't end the streak.
        continue;
      } else {
        break;
      }
    }
    streaks[taskId] = count;
  }
  return streaks;
}
