"use client";
import React, { useMemo, useState } from "react";
import {
  AppState,
  ContentCreator,
  ContentFormat,
  ContentIdea,
  ContentLink,
  ContentPlatform,
  ContentStage,
} from "@/lib/types";
import { getToday } from "@/lib/stateUtils";
import {
  PenTool,
  CheckCircle2,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  Lightbulb,
  Users,
  CalendarDays,
  ListOrdered,
  ArrowUpToLine,
  Archive,
  RotateCcw,
  Eye,
  Circle,
} from "lucide-react";

/* ─── constants ─── */

// Where we post. Ideas can only target these.
const PLATFORMS: ContentPlatform[] = ["Instagram", "YouTube", "LinkedIn"];
// Creators we study can be anywhere.
const CREATOR_PLATFORMS: ContentPlatform[] = ["Instagram", "YouTube", "LinkedIn", "TikTok", "X", "Other"];
const FORMATS_BY_PLATFORM: Record<ContentPlatform, ContentFormat[]> = {
  Instagram: ["Reel", "Carousel", "Story", "Post"],
  YouTube: ["Short", "Long-form"],
  LinkedIn: ["Post", "Carousel", "Video"],
  TikTok: ["Short"],
  X: ["Post", "Video"],
  Other: ["Post", "Video"],
};
const formatsFor = (p: ContentPlatform) => FORMATS_BY_PLATFORM[p] || FORMATS_BY_PLATFORM.Other;
const PIPELINE: { id: ContentStage; label: string; color: string; bg: string }[] = [
  { id: "idea", label: "Idea", color: "#78716C", bg: "#F5F5F4" },
  { id: "script", label: "Script", color: "#7C3AED", bg: "#F5F3FF" },
  { id: "shoot", label: "Shoot", color: "#EA580C", bg: "#FFF7ED" },
  { id: "edit", label: "Edit", color: "#2563EB", bg: "#EFF6FF" },
  { id: "ready", label: "Ready", color: "#16A34A", bg: "#F0FDF4" },
];
const STAGE_META: Record<ContentStage, { label: string; color: string; bg: string }> = {
  ...Object.fromEntries(PIPELINE.map((p) => [p.id, p])),
  posted: { label: "Posted", color: "#16A34A", bg: "#DCFCE7" },
  archived: { label: "Archived", color: "#A8A29E", bg: "#F5F5F4" },
} as Record<ContentStage, { label: string; color: string; bg: string }>;

const PLATFORM_COLOR: Record<ContentPlatform, string> = {
  Instagram: "#C13584",
  YouTube: "#DC2626",
  TikTok: "#0F172A",
  LinkedIn: "#0A66C2",
  X: "#1C1917",
  Other: "#78716C",
};

const ACTIVE_STAGES: ContentStage[] = ["idea", "script", "shoot", "edit", "ready"];

/* ─── helpers ─── */

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const now = () => Date.now();


function detectPlatform(url: string): ContentPlatform {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return "Instagram";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("tiktok.com")) return "TikTok";
  if (u.includes("linkedin.com")) return "LinkedIn";
  if (u.includes("x.com") || u.includes("twitter.com")) return "X";
  return "Other";
}

function linkLabel(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function daysSince(date?: string) {
  if (!date) return null;
  const a = new Date(date + "T00:00:00").getTime();
  const b = new Date(getToday() + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

/* ─── shared styles ─── */

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #F0EEEC",
  boxShadow: "0 4px 20px rgba(28, 25, 23, 0.04), 0 1px 2px rgba(28, 25, 23, 0.03)",
};
const input: React.CSSProperties = {
  width: "100%",
  fontSize: 13,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #E7E5E4",
  background: "#FAFAF9",
  color: "#1C1917",
  outline: "none",
};
const pillBtn = (active: boolean): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 999,
  border: active ? "1px solid #1C1917" : "1px solid #E7E5E4",
  background: active ? "#1C1917" : "#fff",
  color: active ? "#fff" : "#57534E",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});
const iconBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#78716C",
};

function PlatformBadge({ p, f }: { p: ContentPlatform; f?: ContentFormat }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: PLATFORM_COLOR[p],
        border: `1px solid ${PLATFORM_COLOR[p]}33`,
        background: `${PLATFORM_COLOR[p]}0D`,
        padding: "2px 7px",
        borderRadius: 6,
        whiteSpace: "nowrap",
      }}
    >
      {p}
      {f ? ` · ${f}` : ""}
    </span>
  );
}

function StagePill({ stage }: { stage: ContentStage }) {
  const m = STAGE_META[stage];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: m.color, background: m.bg, padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════ */

type Tab = "queue" | "posted" | "creators" | "calendar";

export default function ContentCreationPanel({
  state,
  onSave,
}: {
  state: AppState;
  onSave: (s: AppState) => void;
}) {
  const ideas = state.contentIdeas || [];
  const creators = state.contentCreators || [];
  const postedDates = state.contentPostedDates || [];

  const [tab, setTab] = useState<Tab>("queue");
  const [stageFilter, setStageFilter] = useState<ContentStage | "all">("all");
  // Each platform is its own workspace: its own queue order, UP NEXT, stats and posted log.
  const [platform, setPlatformState] = useState<ContentPlatform>(() => {
    try {
      const saved = localStorage.getItem("content_engine_platform") as ContentPlatform | null;
      if (saved && PLATFORMS.includes(saved)) return saved;
    } catch {}
    return "Instagram";
  });
  const setPlatform = (p: ContentPlatform) => {
    setPlatformState(p);
    setStageFilter("all");
    setOpenId(null);
    try { localStorage.setItem("content_engine_platform", p); } catch {}
  };
  const [openId, setOpenId] = useState<string | null>(null);
  const [capture, setCapture] = useState("");
  const [captureLink, setCaptureLink] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const saveIdeas = (next: ContentIdea[], extra: Partial<AppState> = {}) =>
    onSave({ ...state, contentIdeas: next, ...extra });
  const saveCreators = (next: ContentCreator[]) => onSave({ ...state, contentCreators: next });

  const updateIdea = (id: string, patch: Partial<ContentIdea>) =>
    saveIdeas(ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  /* ── derived, always scoped to the selected platform ── */
  const accent = PLATFORM_COLOR[platform];
  const mine = ideas.filter((i) => i.platform === platform);
  const active = mine.filter((i) => ACTIVE_STAGES.includes(i.stage));
  const queue = stageFilter === "all" ? active : active.filter((i) => i.stage === stageFilter);
  const posted = mine
    .filter((i) => i.stage === "posted")
    .sort((a, b) => (b.postedDate || "").localeCompare(a.postedDate || ""));
  const archived = mine.filter((i) => i.stage === "archived");

  const today = getToday();
  const monthPrefix = today.slice(0, 7);
  const postedThisMonthFor = (p: ContentPlatform) =>
    ideas.filter((i) => i.platform === p && i.stage === "posted" && (i.postedDate || "").startsWith(monthPrefix)).length;
  const activeFor = (p: ContentPlatform) => ideas.filter((i) => i.platform === p && ACTIVE_STAGES.includes(i.stage)).length;
  const inProduction = active.filter((i) => i.stage !== "idea").length;

  /* ── capture ──
     One line = one idea. Lands in the platform you are on unless routed.
     - paste several lines → one idea per line (brain dump)
     - "@yt / @ig / @li" anywhere → send to that platform
     - "Title | hook"     → saves the hook too
     - a link anywhere    → attached as reference, rest becomes the title
     - Shift+Enter        → add to the top as UP NEXT                       */
  const captureRef = React.useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); captureRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const parseLine = (raw: string): ContentIdea | null => {
    let text = raw.trim().replace(/^[-*•\d.)\s]+(?=\S)/, "").trim(); // strip list bullets / numbering
    if (!text) return null;
    let target: ContentPlatform = platform;
    const route = text.match(/(^|\s)@(yt|youtube|ig|insta|instagram|li|linkedin)\b/i);
    if (route) {
      const k = route[2].toLowerCase();
      target = k.startsWith("y") ? "YouTube" : k.startsWith("l") ? "LinkedIn" : "Instagram";
      text = text.replace(route[0], " ").trim();
    }
    const urlMatch = text.match(/https?:\/\/\S+/i);
    const url = urlMatch?.[0];
    if (url) text = text.replace(url, " ").replace(/\s+/g, " ").trim();
    let hook: string | undefined;
    const bar = text.indexOf("|");
    if (bar !== -1) { hook = text.slice(bar + 1).trim() || undefined; text = text.slice(0, bar).trim(); }
    if (!text && !url) return null;
    return {
      id: uid("ci"),
      title: text || `Idea from ${linkLabel(url!)}`,
      hook,
      platform: target,
      format: formatsFor(target)[0], // not shown in the UI; kept for the data shape
      stage: "idea",
      links: url ? [{ id: uid("l"), label: "Reference", url }] : [],
      createdAt: now(),
    };
  };

  const addIdeas = (lines: string[], toTop = false) => {
    const fresh = lines.map(parseLine).filter((x): x is ContentIdea => !!x);
    if (!fresh.length) return;
    let next: ContentIdea[];
    if (toTop) {
      // insert before the first active idea of each idea's platform
      next = [...ideas];
      for (const idea of [...fresh].reverse()) {
        const idx = next.findIndex((i) => i.platform === idea.platform && ACTIVE_STAGES.includes(i.stage));
        if (idx === -1) next.push(idea); else next.splice(idx, 0, idea);
      }
    } else next = [...ideas, ...fresh];
    saveIdeas(next);
    setCapture("");
    if (tab !== "queue") setTab("queue");
    const elsewhere = fresh.filter((i) => i.platform !== platform);
    const msg = `${fresh.length} idea${fresh.length > 1 ? "s" : ""} added${toTop ? " as Up Next" : ""}` +
      (elsewhere.length ? ` · ${elsewhere.length} to ${[...new Set(elsewhere.map((i) => i.platform))].join(", ")}` : "");
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2500);
    if (fresh.length === 1 && fresh[0].title.startsWith("Idea from ") && fresh[0].platform === platform) setOpenId(fresh[0].id);
  };

  const addIdea = (toTop = false) => {
    const link = captureLink.trim();
    const url = link ? (/^https?:\/\//i.test(link) ? link : `https://${link}`) : "";
    addIdeas([[capture.trim(), url].filter(Boolean).join(" ")], toTop);
    setCaptureLink("");
    captureRef.current?.focus();
  };

  /* ── reorder (operates on full ideas array, using ids) ── */
  const moveTo = (id: string, targetId: string | null, position: "before" | "after" = "before") => {
    const without = ideas.filter((i) => i.id !== id);
    const item = ideas.find((i) => i.id === id);
    if (!item) return;
    if (targetId === null) {
      saveIdeas([...without, item]);
      return;
    }
    const idx = without.findIndex((i) => i.id === targetId);
    if (idx === -1) return;
    without.splice(position === "before" ? idx : idx + 1, 0, item);
    saveIdeas(without);
  };

  const step = (id: string, dir: -1 | 1) => {
    const pos = queue.findIndex((i) => i.id === id);
    const neighbour = queue[pos + dir];
    if (!neighbour) return;
    moveTo(id, neighbour.id, dir === -1 ? "before" : "after");
  };
  const toTop = (id: string) => queue[0] && queue[0].id !== id && moveTo(id, queue[0].id, "before");

  const markPosted = (idea: ContentIdea) => {
    const date = idea.postedDate || today;
    const dates = postedDates.includes(date) ? postedDates : [...postedDates, date];
    saveIdeas(
      ideas.map((i) => (i.id === idea.id ? { ...i, stage: "posted" as ContentStage, postedDate: date } : i)),
      { contentPostedDates: dates }
    );
    setOpenId(null);
  };

  const deleteIdea = (id: string) => {
    if (!confirm("Delete this idea permanently?")) return;
    saveIdeas(ideas.filter((i) => i.id !== id));
    if (openId === id) setOpenId(null);
  };

  /* ═══ render ═══ */
  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "queue", label: "Queue", icon: <ListOrdered size={13} />, count: active.length },
    { id: "creators", label: "Creators", icon: <Users size={13} />, count: creators.length },
    { id: "calendar", label: "Calendar", icon: <CalendarDays size={13} /> },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", marginBottom: 2 }}>Content Engine</h1>
        <p style={{ fontSize: 12, color: "#78716C" }}>One queue per platform. Capture ideas, line them up, push them through to posted.</p>
      </div>

      {/* Platform switcher: each one is a separate workspace */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${PLATFORMS.length}, 1fr)`, gap: 8, marginBottom: 14 }}>
        {PLATFORMS.map((p) => {
          const on = p === platform;
          const c = PLATFORM_COLOR[p];
          return (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              style={{
                ...card,
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: 14,
                border: on ? `2px solid ${c}` : "1px solid #F0EEEC",
                background: on ? `${c}0A` : "#fff",
                boxShadow: on ? `0 4px 16px ${c}22` : card.boxShadow,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: on ? c : "#44403C" }}>{p}</span>
              </div>
              <div style={{ fontSize: 11, color: "#78716C" }}>
                <b style={{ color: "#1C1917" }}>{activeFor(p)}</b> in queue · <b style={{ color: "#16A34A" }}>{postedThisMonthFor(p)}</b> posted this month
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick capture: Title + Link */}
      <div style={{ ...card, padding: 8, display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap", borderLeft: `4px solid ${accent}` }}>
        <input
          ref={captureRef}
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          onPaste={(e) => {
            const txt = e.clipboardData.getData("text");
            if (/\r?\n/.test(txt.trim())) { e.preventDefault(); addIdeas(txt.split(/\r?\n/)); }
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) addIdea(e.shiftKey); }}
          placeholder={`Title of the ${platform} idea`}
          style={{ ...input, flex: "2 1 220px", border: "none", background: "transparent", fontSize: 14 }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 160px", borderLeft: "1px solid #F0EEEC", paddingLeft: 10 }}>
          <Link2 size={14} color="#A8A29E" style={{ flexShrink: 0 }} />
          <input
            value={captureLink}
            onChange={(e) => setCaptureLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) addIdea(e.shiftKey); }}
            placeholder="Link (optional)"
            style={{ ...input, border: "none", background: "transparent", fontSize: 13, padding: "8px 4px" }}
          />
        </div>
        <button onClick={() => addIdea()} disabled={!capture.trim() && !captureLink.trim()} style={{ ...pillBtn(true), padding: "8px 14px", background: accent, borderColor: accent, opacity: capture.trim() || captureLink.trim() ? 1 : 0.5 }}>
          <Plus size={14} /> Add
        </button>
        {flash && <div style={{ flexBasis: "100%", fontSize: 11, color: "#16A34A", fontWeight: 600, padding: "0 10px 2px" }}>{flash}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={pillBtn(tab === t.id)}>
            {t.icon}
            {t.label}
            {t.count !== undefined && <span style={{ opacity: 0.6, fontWeight: 500 }}>{t.count}</span>}
          </button>
        ))}
        {tab === "queue" && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#A8A29E" }}>
            {inProduction} in production
          </span>
        )}
      </div>

      {/* ═══ QUEUE ═══ */}
      {tab === "queue" && (
        <>
          <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
            <FilterChip active={stageFilter === "all"} onClick={() => setStageFilter("all")} label={`All ${active.length}`} />
            {PIPELINE.map((p) => (
              <FilterChip
                key={p.id}
                active={stageFilter === p.id}
                onClick={() => setStageFilter(p.id)}
                label={`${p.label} ${active.filter((i) => i.stage === p.id).length}`}
                color={p.color}
              />
            ))}
            <FilterChip active={stageFilter === "posted"} onClick={() => setStageFilter("posted")} label={`Done ${posted.length}`} color="#16A34A" />
          </div>

          {stageFilter === "posted" ? (
            posted.length === 0 ? (
              <Empty text="Nothing done yet. Tick ✓ on an idea when it's posted." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {posted.map((i) => (
                  <div key={i.id} style={{ ...card, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderLeft: `4px solid ${accent}` }}>
                    <button title="Undo: back to queue" style={{ ...iconBtn, color: "#16A34A" }} onClick={() => updateIdea(i.id, { stage: "ready" })}>
                      <CheckCircle2 size={17} />
                    </button>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "#78716C", textDecoration: "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</span>
                    {i.links[0] && (
                      <a href={i.links[0].url} target="_blank" rel="noreferrer" style={iconBtn} title={i.links[0].url}><Link2 size={14} /></a>
                    )}
                    <span style={{ fontSize: 11, color: "#A8A29E" }}>{i.postedDate}</span>
                    <button title="Delete" style={iconBtn} onClick={() => deleteIdea(i.id)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )
          ) : queue.length === 0 ? (
            <Empty
              text={active.length === 0 ? `Your ${platform} queue is empty. Add the first idea above, or paste a link that inspired you.` : "Nothing at this stage."}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {queue.map((idea, idx) => (
                <IdeaRow
                  key={idea.id}
                  idea={idea}
                  position={idx + 1}
                  isNext={idx === 0 && stageFilter === "all"}
                  open={openId === idea.id}
                  dragging={dragId === idea.id}
                  dragOver={overId === idea.id && dragId !== idea.id}
                  onToggle={() => setOpenId(openId === idea.id ? null : idea.id)}
                  onUpdate={(patch) => updateIdea(idea.id, patch)}
                  onUp={() => step(idea.id, -1)}
                  onDown={() => step(idea.id, 1)}
                  onTop={() => toTop(idea.id)}
                  onPosted={() => markPosted(idea)}
                  onArchive={() => { updateIdea(idea.id, { stage: "archived" }); setOpenId(null); }}
                  onDelete={() => deleteIdea(idea.id)}
                  dragHandlers={{
                    draggable: true,
                    onDragStart: (e) => { setDragId(idea.id); e.dataTransfer.effectAllowed = "move"; },
                    onDragOver: (e) => { e.preventDefault(); if (overId !== idea.id) setOverId(idea.id); },
                    onDragLeave: () => setOverId((o) => (o === idea.id ? null : o)),
                    onDrop: (e) => {
                      e.preventDefault();
                      if (dragId && dragId !== idea.id) {
                        const from = queue.findIndex((i) => i.id === dragId);
                        moveTo(dragId, idea.id, from !== -1 && from < idx ? "after" : "before");
                      }
                      setDragId(null);
                      setOverId(null);
                    },
                    onDragEnd: () => { setDragId(null); setOverId(null); },
                  }}
                />
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <details style={{ marginTop: 18 }}>
              <summary style={{ fontSize: 12, color: "#A8A29E", cursor: "pointer", fontWeight: 600 }}>
                Archived ({archived.length})
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {archived.map((i) => (
                  <div key={i.id} style={{ ...card, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 13, color: "#78716C" }}>{i.title}</span>
                    
                    <button title="Back to queue" style={iconBtn} onClick={() => updateIdea(i.id, { stage: "idea" })}>
                      <RotateCcw size={14} />
                    </button>
                    <button title="Delete" style={iconBtn} onClick={() => deleteIdea(i.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* ═══ CREATORS ═══ */}
      {tab === "creators" && (
        <CreatorsView creators={creators} ideas={ideas} onSave={saveCreators} />
      )}

      {/* ═══ CALENDAR ═══ */}
      {tab === "calendar" && (
        <CalendarView
          postedDates={postedDates}
          ideas={ideas}
          onToggle={(d) =>
            onSave({ ...state, contentPostedDates: postedDates.includes(d) ? postedDates.filter((x) => x !== d) : [...postedDates, d] })
          }
        />
      )}
    </div>
  );
}

/* ═══ small pieces ═══ */

function FilterChip({ active, onClick, label: l, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 999,
        background: active ? (color ? `${color}14` : "#F5F5F4") : "transparent",
        color: active ? color || "#1C1917" : "#A8A29E",
        border: active ? `1px solid ${color ? `${color}40` : "#E7E5E4"}` : "1px solid transparent",
      }}
    >
      {l}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ ...card, padding: "36px 24px", textAlign: "center", color: "#A8A29E", fontSize: 13 }}>
      <Lightbulb size={22} style={{ marginBottom: 8, opacity: 0.6 }} />
      <div>{text}</div>
    </div>
  );
}

/* ═══ Idea row + editor ═══ */

function IdeaRow({
  idea,
  position,
  isNext,
  open,
  dragging,
  dragOver,
  onToggle,
  onUpdate,
  onUp,
  onDown,
  onTop,
  onPosted,
  onArchive,
  onDelete,
  dragHandlers,
}: {
  idea: ContentIdea;
  position: number;
  isNext: boolean;
  open: boolean;
  dragging: boolean;
  dragOver: boolean;
  onToggle: () => void;
  onUpdate: (p: Partial<ContentIdea>) => void;
  onUp: () => void;
  onDown: () => void;
  onTop: () => void;
  onPosted: () => void;
  onArchive: () => void;
  onDelete: () => void;
  dragHandlers: React.HTMLAttributes<HTMLDivElement> & { draggable: boolean };
}) {
  const [newLink, setNewLink] = useState("");

  const addLink = () => {
    const u = newLink.trim();
    if (!u) return;
    const url = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    onUpdate({ links: [...idea.links, { id: uid("l"), label: linkLabel(url), url }] });
    setNewLink("");
  };
  const updateLink = (id: string, patch: Partial<ContentLink>) =>
    onUpdate({ links: idea.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) });


  return (
    <div
      {...dragHandlers}
      // An open card holds text fields; keep it non-draggable so text selection works.
      draggable={!open}
      style={{
        ...card,
        opacity: dragging ? 0.4 : 1,
        // Longhand sides only: mixing border shorthands makes React warn on re-render.
        border: undefined,
        borderTop: `${dragOver ? 2 : 1}px solid ${dragOver ? "#1C1917" : isNext ? "#FDE68A" : "#F0EEEC"}`,
        borderRight: `${dragOver ? 2 : 1}px solid ${dragOver ? "#1C1917" : isNext ? "#FDE68A" : "#F0EEEC"}`,
        borderBottom: `${dragOver ? 2 : 1}px solid ${dragOver ? "#1C1917" : isNext ? "#FDE68A" : "#F0EEEC"}`,
        borderLeft: `4px solid ${PLATFORM_COLOR[idea.platform]}`,
        background: isNext ? "#FFFDF5" : "#fff",
        transition: "border-color .12s, opacity .12s",
      }}
    >
      {/* collapsed row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
        <span title="Drag to reorder" style={{ cursor: "grab", color: "#D6D3D1", display: "flex" }}>
          <GripVertical size={16} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#A8A29E", width: 18, textAlign: "right" }}>{position}</span>
        <button onClick={onToggle} style={{ flex: 1, minWidth: 0, textAlign: "left", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {isNext && (
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.6, color: "#B45309", background: "#FEF3C7", padding: "2px 6px", borderRadius: 4 }}>
              UP NEXT
            </span>
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis" }}>{idea.title || "Untitled idea"}</span>
          {idea.links.length > 0 && (
            <span style={{ fontSize: 11, color: "#A8A29E", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Link2 size={11} /> {idea.links.length}
            </span>
          )}
          {!open && idea.hook && (
            <span style={{ flexBasis: "100%", fontSize: 12, color: "#78716C", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              “{idea.hook}”
            </span>
          )}
        </button>
        <StagePill stage={idea.stage} />
        <button title="Mark done" style={iconBtn} onClick={onPosted}><Circle size={16} /></button>
        <button title="Delete idea" style={{ ...iconBtn, color: "#EF4444", opacity: 0.55 }} onClick={onDelete}><Trash2 size={14} /></button>
        <button title="Move up" style={iconBtn} onClick={onUp}><ChevronUp size={15} /></button>
        <button title="Move down" style={iconBtn} onClick={onDown}><ChevronDown size={15} /></button>
      </div>

      {/* expanded editor */}
      {open && (
        <div style={{ borderTop: "1px solid #F5F5F4", padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            value={idea.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Title"
            style={{ ...input, fontSize: 15, fontWeight: 600, background: "transparent", border: "none", padding: "2px 0" }}
          />

          <textarea
            value={idea.description || ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={4}
            placeholder="Description"
            style={{ ...input, resize: "vertical", lineHeight: 1.5 }}
          />

          {/* Older ideas may still have notes from the first version: keep them visible. */}
          {(idea.hook || idea.notes) && (
            <textarea
              value={[idea.hook, idea.notes].filter(Boolean).join("\n")}
              onChange={(e) => onUpdate({ hook: undefined, notes: e.target.value })}
              rows={2}
              style={{ ...input, resize: "vertical", lineHeight: 1.5 }}
            />
          )}

          {/* source links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {idea.links.map((l) => (
              <div key={l.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Link2 size={13} color="#A8A29E" style={{ flexShrink: 0 }} />
                <input value={l.url} onChange={(e) => updateLink(l.id, { url: e.target.value, label: linkLabel(e.target.value) })} style={{ ...input, flex: 1, color: "#2563EB" }} />
                <a href={l.url} target="_blank" rel="noreferrer" style={iconBtn} title="Open source">
                  <ExternalLink size={14} />
                </a>
                <button style={iconBtn} title="Remove" onClick={() => onUpdate({ links: idea.links.filter((x) => x.id !== l.id) })}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Plus size={13} color="#A8A29E" style={{ flexShrink: 0 }} />
              <input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
                onBlur={addLink}
                placeholder="Paste source link"
                style={{ ...input, flex: 1 }}
              />
            </div>
          </div>

          {/* stage: small and quiet */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            {PIPELINE.map((p) => {
              const on = idea.stage === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onUpdate({ stage: p.id })}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: on ? p.bg : "transparent",
                    color: on ? p.color : "#A8A29E",
                    border: on ? `1px solid ${p.color}55` : "1px solid transparent",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* actions */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #F5F5F4", paddingTop: 12 }}>
            <button onClick={onPosted} style={{ ...pillBtn(true), background: "#16A34A", borderColor: "#16A34A" }}>
              <CheckCircle2 size={13} /> Mark posted
            </button>
            <button onClick={onTop} style={pillBtn(false)}><ArrowUpToLine size={13} /> To top</button>
            <div style={{ flex: 1 }} />
            <button onClick={onArchive} style={iconBtn} title="Archive"><Archive size={14} /></button>
            <button onClick={onDelete} style={{ ...iconBtn, color: "#DC2626" }} title="Delete"><Trash2 size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Creators ═══ */

function CreatorsView({
  creators,
  ideas,
  onSave,
}: {
  creators: ContentCreator[];
  ideas: ContentIdea[];
  onSave: (c: ContentCreator[]) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const add = () => {
    if (!name.trim() && !url.trim()) return;
    const full = url.trim() && !/^https?:\/\//i.test(url.trim()) ? `https://${url.trim()}` : url.trim();
    onSave([
      ...creators,
      {
        id: uid("cr"),
        name: name.trim() || linkLabel(full),
        url: full,
        platform: full ? detectPlatform(full) : "Other",
        niche: niche.trim() || undefined,
      },
    ]);
    setName("");
    setUrl("");
    setNiche("");
  };

  const update = (id: string, patch: Partial<ContentCreator>) =>
    onSave(creators.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  // least recently checked first, so the routine is "work down the list"
  const sorted = [...creators].sort((a, b) => (a.lastChecked || "").localeCompare(b.lastChecked || ""));
  const today = getToday();

  return (
    <div>
      <div style={{ ...card, padding: 12, display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Creator name" style={{ ...input, flex: "1 1 140px" }} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Profile link (Instagram, YouTube…)" style={{ ...input, flex: "2 1 220px" }} />
        <input value={niche} onChange={(e) => setNiche(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Why follow? (e.g. hooks, editing)" style={{ ...input, flex: "1 1 160px" }} />
        <button onClick={add} style={pillBtn(true)}><Plus size={13} /> Add creator</button>
      </div>

      {creators.length === 0 ? (
        <Empty text="Add creators you study for ideas. Open their profile, then hit “Checked” so the ones you haven't looked at lately rise to the top." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((c) => {
            const since = daysSince(c.lastChecked);
            const ideaCount = ideas.filter((i) => (i.creatorIds || []).includes(c.id)).length;
            const isEditing = editing === c.id;
            return (
              <div key={c.id} style={{ ...card, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: `${PLATFORM_COLOR[c.platform]}14`,
                      color: PLATFORM_COLOR[c.platform],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                      {c.name} <PlatformBadge p={c.platform} />
                    </div>
                    <div style={{ fontSize: 11, color: "#A8A29E" }}>
                      {c.niche ? `${c.niche} · ` : ""}
                      {since === null ? "Never checked" : since === 0 ? "Checked today" : `Checked ${since}d ago`}
                      {ideaCount > 0 ? ` · ${ideaCount} idea${ideaCount > 1 ? "s" : ""}` : ""}
                    </div>
                  </div>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => update(c.id, { lastChecked: today })}
                      style={{ ...pillBtn(false), textDecoration: "none" }}
                    >
                      <ExternalLink size={13} /> Open
                    </a>
                  )}
                  <button
                    onClick={() => update(c.id, { lastChecked: since === 0 ? undefined : today })}
                    style={{ ...pillBtn(since === 0), ...(since === 0 ? { background: "#16A34A", borderColor: "#16A34A" } : {}) }}
                  >
                    <Eye size={13} /> {since === 0 ? "Checked" : "Mark checked"}
                  </button>
                  <button style={iconBtn} title="Edit" onClick={() => setEditing(isEditing ? null : c.id)}>
                    {isEditing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
                {isEditing && (
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                    <input value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} style={input} placeholder="Name" />
                    <input value={c.url} onChange={(e) => update(c.id, { url: e.target.value, platform: detectPlatform(e.target.value) })} style={input} placeholder="URL" />
                    <select value={c.platform} onChange={(e) => update(c.id, { platform: e.target.value as ContentPlatform })} style={input}>
                      {CREATOR_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                    <input value={c.niche || ""} onChange={(e) => update(c.id, { niche: e.target.value })} style={input} placeholder="Why follow?" />
                    <textarea
                      value={c.notes || ""}
                      onChange={(e) => update(c.id, { notes: e.target.value })}
                      placeholder="What works for them: hook styles, formats, posting cadence…"
                      rows={2}
                      style={{ ...input, gridColumn: "1 / -1", resize: "vertical" }}
                    />
                    <button
                      onClick={() => confirm(`Remove ${c.name}?`) && onSave(creators.filter((x) => x.id !== c.id))}
                      style={{ ...pillBtn(false), color: "#DC2626", justifySelf: "start" }}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                )}
                {!isEditing && c.notes && <div style={{ fontSize: 12, color: "#78716C", marginTop: 8, paddingLeft: 42 }}>{c.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══ Calendar ═══ */

function CalendarView({
  postedDates,
  ideas,
  onToggle,
}: {
  postedDates: string[];
  ideas: ContentIdea[];
  onToggle: (d: string) => void;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const { y: year, m: month } = cursor;
  const todayStr = getToday();
  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long" });
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const days = useMemo(() => {
    const list: ({ day: number; dateStr: string } | null)[] = [];
    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < first; i++) list.push(null);
    for (let i = 1; i <= count; i++) list.push({ day: i, dateStr: `${prefix}-${String(i).padStart(2, "0")}` });
    return list;
  }, [year, month, prefix]);

  const shift = (d: number) => {
    const dt = new Date(year, month + d, 1);
    setCursor({ y: dt.getFullYear(), m: dt.getMonth() });
  };

  return (
    <div style={{ ...card, padding: 20, maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button style={iconBtn} onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1C1917", minWidth: 150, textAlign: "center" }}>
            {monthName} {year}
          </h2>
          <button style={iconBtn} onClick={() => shift(1)}><ChevronRight size={16} /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#16A34A", background: "#F0FDF4", padding: "4px 10px", borderRadius: 20, border: "1px solid #BBF7D0" }}>
          <PenTool size={12} />
          {postedDates.filter((d) => d.startsWith(prefix)).length} Posted
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#A8A29E", marginBottom: 10 }}>
        Click a day to toggle it. Filled dot = posted, ring = planned target date:{" "}
        {PLATFORMS.map((p, i) => (
          <span key={p} style={{ color: PLATFORM_COLOR[p], fontWeight: 600 }}>{p}{i < PLATFORMS.length - 1 ? " · " : ""}</span>
        ))}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 8 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#A8A29E" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((item, index) => {
          if (!item) return <div key={`e-${index}`} />;
          const { day, dateStr } = item;
          const isPosted = postedDates.includes(dateStr);
          const isToday = dateStr === todayStr;
          const postedHere = ideas.filter((i) => i.stage === "posted" && i.postedDate === dateStr);
          const planned = ideas.filter((i) => ACTIVE_STAGES.includes(i.stage) && i.targetDate === dateStr);
          const tip = [
            ...postedHere.map((i) => `✓ ${i.platform}: ${i.title}`),
            ...planned.map((i) => `◦ ${i.platform}: ${i.title} (${STAGE_META[i.stage].label})`),
          ].join("\n");
          return (
            <button
              key={dateStr}
              onClick={() => onToggle(dateStr)}
              title={tip || (isPosted ? "Mark as not posted" : "Mark as posted")}
              style={{
                aspectRatio: "1/1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                borderRadius: 10,
                border: isPosted ? "2px solid #22C55E" : isToday ? "2px solid #D6D3D1" : "1px solid #F0EEEC",
                background: isPosted ? "#F0FDF4" : "#FAFAF9",
                color: isPosted ? "#16A34A" : "#44403C",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isPosted || isToday ? 700 : 500 }}>{day}</span>
              <span style={{ display: "flex", gap: 2, height: 12, alignItems: "center" }}>
                {PLATFORMS.map((p) => {
                  const didPost = postedHere.some((i) => i.platform === p);
                  const plan = planned.some((i) => i.platform === p);
                  if (!didPost && !plan) return null;
                  const c = PLATFORM_COLOR[p];
                  // filled = posted, ring = planned
                  return <span key={p} style={{ width: 7, height: 7, borderRadius: 4, background: didPost ? c : "transparent", border: `1.5px solid ${c}` }} />;
                })}
                {isPosted && postedHere.length === 0 && <CheckCircle2 size={12} color="#16A34A" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
