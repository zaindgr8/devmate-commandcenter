"use client";
import { useState } from "react";
import { Plus, Trash2, Download, Smartphone, ChevronDown } from "lucide-react";
import { AppState, AppTracker, AppEntry, AppStatus } from "@/lib/types";

const APP_STATUSES: AppStatus[] = ["Idea", "In Development", "In Review", "Live", "Paused"];

const STATUS_META: Record<AppStatus, { bg: string; fg: string; dot: string; border: string }> = {
  Idea:           { bg: "#F5F5F4", fg: "#78716C", dot: "#A8A29E", border: "#E7E5E4" },
  "In Development": { bg: "#EFF6FF", fg: "#2563EB", dot: "#3B82F6", border: "#BFDBFE" },
  "In Review":    { bg: "#FFF7ED", fg: "#EA580C", dot: "#F97316", border: "#FED7AA" },
  Live:           { bg: "#F0FDF4", fg: "#16A34A", dot: "#22C55E", border: "#BBF7D0" },
  Paused:         { bg: "#FFF1F2", fg: "#BE123C", dot: "#F43F5E", border: "#FECDD3" },
};

function StatusPicker({ value, onChange }: { value: AppStatus; onChange: (s: AppStatus) => void }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[value];
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 10px 5px 8px", borderRadius: 20,
          background: meta.bg, border: `1px solid ${meta.border}`,
          color: meta.fg, fontSize: 11, fontWeight: 700, cursor: "pointer",
          transition: "all 0.15s", whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.dot, flexShrink: 0 }} />
        {value}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
          background: "#fff", border: "1px solid #E7E5E4", borderRadius: 12,
          boxShadow: "0 8px 24px rgba(28,25,23,0.12)", overflow: "hidden", minWidth: 140,
        }}>
          {APP_STATUSES.map((s) => {
            const m = STATUS_META[s];
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", fontSize: 12, fontWeight: 600,
                  color: s === value ? m.fg : "#44403C",
                  background: s === value ? m.bg : "transparent",
                  borderBottom: "1px solid #F0EEEC", cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (s !== value) e.currentTarget.style.background = "#F9FAFB"; }}
                onMouseLeave={(e) => { if (s !== value) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AppTrackerPanel({
  state,
  onSave,
}: {
  state: AppState;
  onSave: (s: AppState) => void;
}) {
  const trackers: AppTracker[] = state.appTrackers || [];

  const saveTrackers = (updated: AppTracker[]) => onSave({ ...state, appTrackers: updated });

  /* ── Tracker-level ops ── */
  const addTracker = () => {
    saveTrackers([
      ...trackers,
      {
        id: "tr_" + Date.now(),
        title: "My Apps",
        apps: [
          { id: "a_" + Date.now(), name: "App 1", status: "Idea", downloads: 0 },
        ],
      },
    ]);
  };

  const delTracker = (tid: string) => saveTrackers(trackers.filter((t) => t.id !== tid));

  const updateTracker = (tid: string, fn: (t: AppTracker) => AppTracker) =>
    saveTrackers(trackers.map((t) => (t.id === tid ? fn(t) : t)));

  /* ── App-level ops ── */
  const addApp = (tid: string) =>
    updateTracker(tid, (t) => ({
      ...t,
      apps: [
        ...t.apps,
        { id: "a_" + Date.now(), name: `App ${t.apps.length + 1}`, status: "Idea", downloads: 0 },
      ],
    }));

  const delApp = (tid: string, aid: string) =>
    updateTracker(tid, (t) => ({ ...t, apps: t.apps.filter((a) => a.id !== aid) }));

  const updateApp = (tid: string, aid: string, patch: Partial<AppEntry>) =>
    updateTracker(tid, (t) => ({
      ...t,
      apps: t.apps.map((a) => (a.id === aid ? { ...a, ...patch } : a)),
    }));

  /* ── Inline edit helpers ── */
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");

  const [editingAppName, setEditingAppName] = useState<{ tid: string; aid: string } | null>(null);
  const [editingAppNameText, setEditingAppNameText] = useState("");

  const [editingDownloads, setEditingDownloads] = useState<{ tid: string; aid: string } | null>(null);
  const [editingDownloadsText, setEditingDownloadsText] = useState("");

  const card: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(12px)",
    borderRadius: 18,
    border: "1px solid rgba(240, 238, 236, 0.7)",
    boxShadow: "0 4px 20px rgba(28, 25, 23, 0.03), 0 1px 2px rgba(28, 25, 23, 0.02)",
    // removed overflow: hidden to prevent clipping dropdowns if they extend outside, though overflowX:auto handles mostly
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>
            App Tracker
          </h1>
          <p style={{ fontSize: 13, color: "#78716C" }}>Track your apps — status, downloads, and progress</p>
        </div>
        <button
          onClick={addTracker}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
            background: "linear-gradient(135deg, #1C1917 0%, #44403C 100%)",
            color: "#fff", cursor: "pointer", border: "none",
            boxShadow: "0 10px 20px -10px rgba(0,0,0,0.3)", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 15px 30px -12px rgba(0,0,0,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 10px 20px -10px rgba(0,0,0,0.3)"; }}
        >
          <Plus size={16} /> New Dashboard
        </button>
      </div>

      {trackers.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#A8A29E" }}>
          <Smartphone size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14, fontWeight: 500 }}>No app boards yet.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Click "New Board" to start tracking your apps.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {trackers.map((tracker) => {
          const liveCount = tracker.apps.filter((a) => a.status === "Live").length;
          const totalDownloads = tracker.apps.reduce((sum, a) => sum + (a.downloads || 0), 0);

          return (
            <div key={tracker.id} style={card}>
              {/* Board header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px", borderBottom: "1px solid #F0EEEC",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {editingTitle === tracker.id ? (
                    <input
                      autoFocus
                      value={editingTitleText}
                      onChange={(e) => setEditingTitleText(e.target.value)}
                      onBlur={() => { updateTracker(tracker.id, (t) => ({ ...t, title: editingTitleText.trim() || t.title })); setEditingTitle(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") { updateTracker(tracker.id, (t) => ({ ...t, title: editingTitleText.trim() || t.title })); setEditingTitle(null); } }}
                      style={{
                        fontSize: 15, fontWeight: 600, color: "#1C1917",
                        border: "1px solid #BFDBFE", borderRadius: 8, background: "#EFF6FF",
                        padding: "4px 10px", outline: "none",
                      }}
                    />
                  ) : (
                    <h2
                      onDoubleClick={() => { setEditingTitle(tracker.id); setEditingTitleText(tracker.title); }}
                      title="Double-click to rename"
                      style={{ fontSize: 15, fontWeight: 600, color: "#1C1917", cursor: "text" }}
                    >
                      {tracker.title}
                    </h2>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E", paddingTop: 2 }}>
                    {tracker.apps.length} app{tracker.apps.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* Summary badges */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E" }} />
                      {liveCount} Live
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>
                      <Download size={11} />
                      {totalDownloads.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => delTracker(tracker.id)}
                    title="Delete board"
                    style={{ padding: 6, borderRadius: 8, color: "#EF4444", opacity: 0.4, cursor: "pointer", transition: "opacity 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Column table */}
              <div style={{ overflowX: "auto", paddingBottom: 160 }}>
                <div style={{ display: "flex", minWidth: "max-content", gap: 0 }}>
                  {/* Row labels column */}
                  <div style={{ flexShrink: 0, width: 130, display: "flex", flexDirection: "column" }}>
                    {/* Header cell — blank */}
                    <div style={{ height: 48, borderBottom: "1px solid #F0EEEC", borderRight: "1px solid #F0EEEC", background: "#FAFAF9" }} />
                    {/* Row: Status */}
                    <div style={{
                      height: 52, display: "flex", alignItems: "center", paddingLeft: 16,
                      borderBottom: "1px solid #F0EEEC", borderRight: "1px solid #F0EEEC",
                      background: "#FAFAF9",
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Status</span>
                    </div>
                    {/* Row: Downloads */}
                    <div style={{
                      height: 52, display: "flex", alignItems: "center", paddingLeft: 16,
                      borderRight: "1px solid #F0EEEC",
                      background: "#FAFAF9",
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Downloads</span>
                    </div>
                  </div>

                  {/* One column per app */}
                  {tracker.apps.map((app, appIdx) => {
                    const isLastApp = appIdx === tracker.apps.length - 1;
                    const meta = STATUS_META[app.status];
                    const isEditingName = editingAppName?.tid === tracker.id && editingAppName?.aid === app.id;
                    const isEditingDl = editingDownloads?.tid === tracker.id && editingDownloads?.aid === app.id;

                    return (
                      <div
                        key={app.id}
                        style={{
                          flexShrink: 0, width: 220, display: "flex", flexDirection: "column",
                          borderRight: isLastApp ? "none" : "1px solid #F0EEEC",
                        }}
                      >
                        {/* App name header */}
                        <div style={{
                          height: 48, display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "0 10px 0 12px", borderBottom: "1px solid #F0EEEC", background: "#FAFAF9", gap: 6,
                        }}>
                          {isEditingName ? (
                            <input
                              autoFocus
                              value={editingAppNameText}
                              onChange={(e) => setEditingAppNameText(e.target.value)}
                              onBlur={() => { updateApp(tracker.id, app.id, { name: editingAppNameText.trim() || app.name }); setEditingAppName(null); }}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") { updateApp(tracker.id, app.id, { name: editingAppNameText.trim() || app.name }); setEditingAppName(null); } }}
                              style={{
                                fontSize: 13, fontWeight: 600, width: "100%",
                                border: "1px solid #BFDBFE", borderRadius: 6, background: "#EFF6FF",
                                padding: "2px 8px", outline: "none", color: "#1C1917",
                              }}
                            />
                          ) : (
                            <span
                              onDoubleClick={() => { setEditingAppName({ tid: tracker.id, aid: app.id }); setEditingAppNameText(app.name); }}
                              title="Double-click to rename"
                              style={{ fontSize: 13, fontWeight: 600, color: "#1C1917", cursor: "text", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                              {app.name}
                            </span>
                          )}
                          <button
                            onClick={() => delApp(tracker.id, app.id)}
                            title="Remove app"
                            style={{ flexShrink: 0, padding: 3, borderRadius: 6, color: "#EF4444", opacity: 0.3, cursor: "pointer", transition: "opacity 0.15s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.3")}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Status cell */}
                        <div style={{
                          height: 52, display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "0 8px", borderBottom: "1px solid #F0EEEC",
                        }}>
                          <StatusPicker value={app.status} onChange={(s) => updateApp(tracker.id, app.id, { status: s })} />
                        </div>

                        {/* Downloads cell */}
                        <div style={{
                          height: 52, display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "0 8px",
                        }}>
                          {isEditingDl ? (
                            <input
                              autoFocus
                              type="number"
                              min={0}
                              value={editingDownloadsText}
                              onChange={(e) => setEditingDownloadsText(e.target.value)}
                              onBlur={() => {
                                const v = parseInt(editingDownloadsText, 10);
                                updateApp(tracker.id, app.id, { downloads: isNaN(v) ? app.downloads : Math.max(0, v) });
                                setEditingDownloads(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") {
                                  const v = parseInt(editingDownloadsText, 10);
                                  updateApp(tracker.id, app.id, { downloads: isNaN(v) ? app.downloads : Math.max(0, v) });
                                  setEditingDownloads(null);
                                }
                              }}
                              style={{
                                fontSize: 13, fontWeight: 600, width: 90, textAlign: "center",
                                border: "1px solid #BFDBFE", borderRadius: 6, background: "#EFF6FF",
                                padding: "4px 8px", outline: "none", color: "#1C1917",
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => { setEditingDownloads({ tid: tracker.id, aid: app.id }); setEditingDownloadsText(String(app.downloads)); }}
                              title="Click to edit downloads"
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "4px 10px", borderRadius: 8,
                                fontSize: 13, fontWeight: 700, color: "#1C1917",
                                background: "none", border: "1px dashed transparent",
                                cursor: "pointer", transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#BFDBFE"; e.currentTarget.style.background = "#EFF6FF"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "none"; }}
                            >
                              <Download size={12} color={meta.dot} />
                              {app.downloads.toLocaleString()}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* [+] Add App column */}
                  <div style={{ flexShrink: 0, width: 56, display: "flex", flexDirection: "column" }}>
                    <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #F0EEEC", background: "#FAFAF9" }}>
                      <button
                        onClick={() => addApp(tracker.id)}
                        title="Add app"
                        style={{
                          width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                          background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#2563EB", cursor: "pointer",
                          fontSize: 18, fontWeight: 700, transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#2563EB"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.color = "#2563EB"; }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div style={{ height: 52, borderBottom: "1px solid #F0EEEC" }} />
                    <div style={{ height: 52 }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
