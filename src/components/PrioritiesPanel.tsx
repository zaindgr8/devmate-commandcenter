"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Flag, GripVertical, Plus, Trash2 , StickyNote, X } from "lucide-react";
import { Priority, PriorityCategory, PriorityStatus } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Priorities: Category > Item (e.g. Clients > Yahya, Diva)
   - Each category has its own inline "Add to …" line (comma = several at once).
   - The bottom "New category" line understands "Clients > Yahya, Diva".
   - Each item has a status, changed only by you: Not started → Pending → Top → Done.
   - "Top" view: every Top item from every category in one ranked list (drag to rank).
   - Items untouched for STALE_DAYS+ get an amber badge so nothing silently rots.
   - Drag items between categories (drop on an item or on a category header);
     drag category headers to reorder categories.
   ───────────────────────────────────────────────────────────────────────────── */

const STALE_DAYS = 7;
const CATEGORY_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DB2777", "#0891B2", "#DC2626", "#4B5563"];
const UNCAT = "__uncat";

type Status = "not_started" | "pending" | "top" | "done";
// Click the circle to cycle: Not started → Pending → Top → Done → Not started
const STATUS_META: Record<Status, { label: string; color: string; bg: string; next: Status }> = {
  not_started: { label: "Not started", color: "#A8A29E", bg: "#F5F5F4", next: "pending" },
  pending: { label: "Pending", color: "#D97706", bg: "#FFFBEB", next: "top" },
  top: { label: "Top", color: "#DC2626", bg: "#FEF2F2", next: "done" },
  done: { label: "Done", color: "#059669", bg: "#ECFDF5", next: "not_started" },
};
const STATUS_ORDER: Status[] = ["not_started", "pending", "top", "done"];
// Older items used "active" / "waiting"
const toStatus = (s?: PriorityStatus): Status => (s === "waiting" ? "pending" : s && s in STATUS_META ? (s as Status) : "not_started");

type Filter = "top" | "all" | "not_started" | "pending";
const VIEW_KEY = "priorities_view";

interface Props {
  priorities: Priority[];
  categories: PriorityCategory[];
  cardStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  onChange: (priorities: Priority[], categories: PriorityCategory[]) => void;
}

const now = () => new Date().toISOString();
// local calendar day, so "the day ends" at the user's midnight
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function daysSince(iso?: string) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return Number.isFinite(d) ? d : null;
}

export default function PrioritiesPanel({ priorities, categories, cardStyle, inputStyle, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const [filter, setFilterState] = useState<Filter>(() => {
    try { const v = localStorage.getItem(VIEW_KEY) as Filter | null; if (v && ["top", "all", "not_started", "pending"].includes(v)) return v; } catch {}
    return "all";
  });
  const setFilter = (f: Filter) => { setFilterState(f); try { localStorage.setItem(VIEW_KEY, f); } catch {} };
  const today = localDay();

  // quick add
  const [subText, setSubText] = useState<Record<string, string>>({});
  const subRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const newCatRef = useRef<HTMLInputElement | null>(null);

  // category create / rename
  const [newCatName, setNewCatName] = useState("");
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  // item edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const noteItem = noteId ? priorities.find((p) => p.id === noteId) : undefined;

  // drag
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragCat, setDragCat] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const catIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);
  const catOf = (p: Priority) => (p.categoryId && catIds.has(p.categoryId) ? p.categoryId : UNCAT);
  const statusOf = (p: Priority): Status => toStatus(p.status);
  // only items that sit in a category are shown (there is no "Uncategorized" bucket)
  const listed = priorities.filter((p) => catOf(p) !== UNCAT);

  const openCount = listed.filter((p) => statusOf(p) !== "done").length;
  const countOf = (st: Status) => listed.filter((p) => statusOf(p) === st).length;
  // Top list: ranked by topRank, then by their place in the list
  const topItems = listed
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => statusOf(p) === "top" || (statusOf(p) === "done" && p.topRank != null))
    .sort((a, b) => (a.p.topRank ?? 1e9) - (b.p.topRank ?? 1e9) || a.i - b.i)
    .map(({ p }) => p);
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const staleCount = listed.filter((p) => statusOf(p) !== "done" && (daysSince(p.touchedAt) ?? 0) >= STALE_DAYS).length;

  const visible = (p: Priority) => {
    const s = statusOf(p);
    // Done items stay (crossed out) until the day ends, then they're deleted
    if (s === "done") return filter === "all";
    if (filter === "all" || filter === "top") return true;
    return s === filter;
  };

  /* ── end of day: delete items marked Done on an earlier day ── */
  useEffect(() => {
    const done = priorities.filter((p) => toStatus(p.status) === "done");
    if (!done.length) return;
    const expired = done.some((p) => p.doneAt && p.doneAt < today);
    const unstamped = done.some((p) => !p.doneAt); // done before this feature: give them until tonight
    if (!expired && !unstamped) return;
    onChange(
      priorities
        .filter((p) => !(toStatus(p.status) === "done" && p.doneAt && p.doneAt < today))
        .map((p) => (toStatus(p.status) === "done" && !p.doneAt ? { ...p, doneAt: today } : p)),
      categories,
    );
  }, [priorities, categories, today, onChange]);

  // re-check at midnight while the page stays open
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = new Date();
    const msToMidnight = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1, 0, 0, 5).getTime() - t.getTime();
    const id = window.setTimeout(() => setTick((n) => n + 1), msToMidnight);
    return () => window.clearTimeout(id);
  }, [today]);

  /* ── mutations ── */
  const updateItem = (id: string, patch: Partial<Priority>) => {
    // entering Top puts it at the bottom of the Top list
    const cur = priorities.find((p) => p.id === id);
    if (patch.status && cur) {
      const from = toStatus(cur.status);
      if (patch.status === "top" && from !== "top") patch = { ...patch, topRank: topItems.length };
      if (patch.status === "done") patch = { ...patch, doneAt: today, topRank: from === "top" ? cur.topRank : undefined };
      else patch = { ...patch, doneAt: undefined };
      if (patch.status === "not_started" || patch.status === "pending") patch = { ...patch, topRank: undefined };
    }
    onChange(priorities.map((p) => (p.id === id ? { ...p, ...patch, touchedAt: now() } : p)), categories);
  };

  const dropOnTop = (targetId: string) => {
    if (!dragItem || dragItem === targetId) return;
    const ids = topItems.map((p) => p.id).filter((i) => i !== dragItem);
    const to = ids.indexOf(targetId);
    if (to === -1) return;
    ids.splice(to, 0, dragItem);
    const rank = new Map(ids.map((i, n) => [i, n]));
    onChange(priorities.map((p) => (rank.has(p.id) ? { ...p, topRank: rank.get(p.id) } : p)), categories);
  };

  const deleteItem = (id: string) => onChange(priorities.filter((p) => p.id !== id), categories);

  const createCategory = (name: string, list = categories): PriorityCategory => {
    const c: PriorityCategory = { id: uid("pc_"), name, color: CATEGORY_COLORS[list.length % CATEGORY_COLORS.length] };
    return c;
  };

  /** Add one or more sub-categories ("Yahya, Diva") under a category. */
  const addSubs = (catId: string, raw: string, cats = categories) => {
    const names = raw.split(",").map((t) => t.trim()).filter(Boolean);
    if (!names.length) return;
    const categoryId = catId === UNCAT ? undefined : catId;
    const items: Priority[] = names.map((t) => ({ id: uid("p_"), text: t, categoryId, status: "not_started", touchedAt: now() }));
    onChange([...priorities, ...items], cats.map((c) => (c.id === catId ? { ...c, collapsed: false } : c)));
    setSubText((m) => ({ ...m, [catId]: "" }));
  };

  /** New category; "Clients > Yahya, Diva" also adds its sub-categories. */
  const handleNewCategory = () => {
    const raw = newCatName.trim();
    if (!raw) return;
    const m = raw.match(/^(.+?)\s*>\s*(.*)$/);
    const name = (m ? m[1] : raw).trim();
    const subs = m ? m[2] : "";
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const cat = existing || createCategory(name);
    const cats = existing ? categories : [...categories, cat];
    if (subs.trim()) addSubs(cat.id, subs, cats);
    else if (!existing) onChange(priorities, cats);
    setNewCatName("");
    // jump straight to adding its sub-categories
    window.setTimeout(() => subRefs.current[cat.id]?.focus(), 50);
  };

  const updateCategory = (id: string, patch: Partial<PriorityCategory>) =>
    onChange(priorities, categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const deleteCategory = (cat: PriorityCategory) => {
    const n = priorities.filter((p) => p.categoryId === cat.id).length;
    if (!window.confirm(`Delete category "${cat.name}"${n ? ` and its ${n} item(s)` : ""}? This can't be undone.`)) return;
    onChange(
      priorities.filter((p) => p.categoryId !== cat.id),
      categories.filter((c) => c.id !== cat.id),
    );
  };

  const cycleColor = (cat: PriorityCategory) => {
    const i = CATEGORY_COLORS.indexOf(cat.color);
    updateCategory(cat.id, { color: CATEGORY_COLORS[(i + 1) % CATEGORY_COLORS.length] });
  };

  /* ── drag & drop ── */
  const dropItemOnItem = (targetId: string) => {
    if (!dragItem || dragItem === targetId) return;
    const list = [...priorities];
    const from = list.findIndex((p) => p.id === dragItem);
    if (from === -1) return;
    const [moved] = list.splice(from, 1);
    const to = list.findIndex((p) => p.id === targetId);
    if (to === -1) return;
    const target = list[to];
    list.splice(to, 0, { ...moved, categoryId: catOf(target) === UNCAT ? undefined : target.categoryId });
    onChange(list, categories);
  };

  const dropItemOnCategory = (catId: string) => {
    if (!dragItem) return;
    const list = priorities.filter((p) => p.id !== dragItem);
    const moved = priorities.find((p) => p.id === dragItem);
    if (!moved) return;
    list.push({ ...moved, categoryId: catId === UNCAT ? undefined : catId });
    onChange(list, categories.map((c) => (c.id === catId ? { ...c, collapsed: false } : c)));
  };

  const dropCategoryOnCategory = (targetId: string) => {
    if (!dragCat || dragCat === targetId || targetId === UNCAT) return;
    const list = [...categories];
    const from = list.findIndex((c) => c.id === dragCat);
    const to = list.findIndex((c) => c.id === targetId);
    if (from === -1 || to === -1) return;
    const [m] = list.splice(from, 1);
    list.splice(to, 0, m);
    onChange(priorities, list);
  };

  const endDrag = () => { setDragItem(null); setDragCat(null); setDropTarget(null); };

  /* ── groups ── */
  const groups: { cat: PriorityCategory | null; id: string; items: Priority[]; all: Priority[] }[] = [
    ...categories.map((c) => {
      const all = priorities.filter((p) => catOf(p) === c.id);
      return { cat: c, id: c.id, all, items: all.filter(visible) };
    }),
  ];

  /* ── styles ── */
  const chip = (active: boolean, color = "#2563EB"): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, cursor: "pointer",
    border: `1px solid ${active ? color : "#E7E5E4"}`, background: active ? color + "14" : "#fff", color: active ? color : "#78716C",
  });
  // one card side, written longhand so changing borderTop never clashes with a border shorthand
  const SIDE = (cardStyle.border as string | undefined) || "1px solid #F0EEEC";
  const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: 4, display: "flex", alignItems: "center", color: "#A8A29E" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid #E7E5E4", paddingTop: 18, marginTop: 16 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
          <span style={{ color: "#78716C", display: "flex" }}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
          <Flag size={13} color="#2563EB" />
          <h3 style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "#78716C", margin: 0 }}>Priorities</h3>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: "#EFF6FF", color: "#2563EB" }} title="Open items">{openCount}</span>
          {staleCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: "#FFFBEB", color: "#B45309" }} title={`${staleCount} open item(s) untouched for ${STALE_DAYS}+ days`}>
              {staleCount} stale
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setOpen(true); window.setTimeout(() => newCatRef.current?.focus(), 50); }} style={{ ...iconBtn, color: "#2563EB", fontSize: 11, fontWeight: 700, gap: 2 }} title="New category">
            <Plus size={12} /> Category
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* ── Filters ── */}
          {listed.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              <button style={chip(filter === "top", "#DC2626")} onClick={() => setFilter("top")}>★ Top {countOf("top")}</button>
              <button style={chip(filter === "all")} onClick={() => setFilter("all")}>All {openCount}</button>
              <button style={chip(filter === "not_started", "#78716C")} onClick={() => setFilter("not_started")}>Not started {countOf("not_started")}</button>
              <button style={chip(filter === "pending", "#D97706")} onClick={() => setFilter("pending")}>Pending {countOf("pending")}</button>
            </div>
          )}

          {/* ── Top: the most important item(s) from every category, ranked ── */}
          {filter === "top" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {topItems.length === 0 && (
                <span style={{ fontSize: 11, color: "#A8A29E", padding: "6px 4px" }}>Nothing marked Top yet. Click an item’s circle until it turns red.</span>
              )}
              {topItems.map((p, index) => {
                const cat = catById[p.categoryId || ""];
                const isDropItem = dropTarget === "top:" + p.id;
                const isDone = statusOf(p) === "done";
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => { setDragItem(p.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={(e) => { e.preventDefault(); setDropTarget("top:" + p.id); }}
                    onDrop={(e) => { e.preventDefault(); dropOnTop(p.id); endDrag(); }}
                    onDragEnd={endDrag}
                    className="prio-item"
                    style={{
                      ...cardStyle, padding: "7px 8px", borderRadius: 8, boxShadow: "none",
                      display: "flex", alignItems: "center", gap: 7, cursor: "grab",
                      border: undefined, borderRight: SIDE, borderBottom: SIDE,
                      borderLeft: `3px solid ${cat?.color || "#DC2626"}`,
                      opacity: dragItem === p.id ? 0.4 : 1,
                      borderTop: isDropItem ? "2px solid #DC2626" : SIDE,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#DC2626", width: 14, textAlign: "right", flexShrink: 0 }}>{index + 1}</span>
                    <button
                      onClick={() => updateItem(p.id, { status: isDone ? "not_started" : "done" })}
                      title={isDone ? "Done · click to start again (Not started)" : "Top · click to mark Done"}
                      style={{ width: 14, height: 14, borderRadius: 7, flexShrink: 0, cursor: "pointer", padding: 0, border: `2px solid ${isDone ? "#059669" : "#DC2626"}`, background: isDone ? "#059669" : "#DC2626" }}
                    />
                    <span
                      onDoubleClick={() => setNoteId(p.id)}
                      title="Double-click to open notes"
                      style={{ fontSize: 12, fontWeight: 700, color: isDone ? "#A8A29E" : "#1C1917", textDecoration: isDone ? "line-through" : "none", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {p.text}
                    </span>
                    {p.notes?.trim() && <StickyNote size={11} color="#A8A29E" style={{ flexShrink: 0 }} />}
                    {cat && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: cat.color + "14", color: cat.color, flexShrink: 0, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cat.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Groups ── */}
          {filter !== "top" && groups.map(({ cat, id, items, all }) => {
              const collapsed = !!cat?.collapsed;
              const color = cat?.color || "#A8A29E";
              const openInCat = all.filter((p) => statusOf(p) !== "done").length;
              const isDrop = dropTarget === "cat:" + id;
              return (
                <div key={id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {/* Category header */}
                  <div
                    draggable={!!cat && renamingCat !== id}
                    onDragStart={(e) => { if (!cat) return; e.stopPropagation(); setDragCat(id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={(e) => { e.preventDefault(); setDropTarget("cat:" + id); }}
                    onDragLeave={() => setDropTarget((t) => (t === "cat:" + id ? null : t))}
                    onDrop={(e) => { e.preventDefault(); if (dragItem) dropItemOnCategory(id); else if (dragCat) dropCategoryOnCategory(id); endDrag(); }}
                    onDragEnd={endDrag}
                    className="prio-cat"
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 8, userSelect: "none",
                      background: isDrop ? color + "14" : "transparent", outline: isDrop ? `1.5px dashed ${color}` : "none",
                      opacity: dragCat === id ? 0.4 : 1, cursor: cat ? "grab" : "default",
                    }}
                  >
                    <button onClick={() => cat && updateCategory(cat.id, { collapsed: !collapsed })} style={{ ...iconBtn, color: "#78716C", padding: 0 }} disabled={!cat}>
                      {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <span
                      onClick={() => cat && cycleColor(cat)}
                      title={cat ? "Click to change colour" : undefined}
                      style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0, cursor: cat ? "pointer" : "default" }}
                    />
                    {cat && renamingCat === id ? (
                      <input
                        autoFocus
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onBlur={() => { if (renameText.trim()) updateCategory(id, { name: renameText.trim() }); setRenamingCat(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setRenamingCat(null); }}
                        style={{ ...inputStyle, fontSize: 11, padding: "2px 6px", flex: 1, minWidth: 0 }}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => { if (cat) { setRenamingCat(id); setRenameText(cat.name); } }}
                        title={cat ? "Double-click to rename · drag to reorder" : "Items without a category"}
                        style={{ fontSize: 11, fontWeight: 800, color: cat ? "#44403C" : "#A8A29E", letterSpacing: 0.3, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {cat ? cat.name : "Uncategorized"}
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E" }}>{openInCat}</span>
                    {cat && (
                      <>
                        <button
                          className="prio-cat-btn"
                          onClick={() => { if (collapsed) updateCategory(cat.id, { collapsed: false }); window.setTimeout(() => subRefs.current[cat.id]?.focus(), 50); }}
                          style={{ ...iconBtn, color: color }}
                          title={`Add sub-category to ${cat.name}`}
                        >
                          <Plus size={12} />
                        </button>
                        <button className="prio-cat-btn" onClick={() => deleteCategory(cat)} style={{ ...iconBtn, color: "#EF4444" }} title="Delete category">
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Items */}
                  {!collapsed && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingLeft: 10, borderLeft: `2px solid ${color}33`, marginLeft: 9 }}>
                      {items.length === 0 && all.length > 0 && (
                        <span style={{ fontSize: 10, color: "#A8A29E", padding: "2px 4px" }}>Nothing matches this filter.</span>
                      )}
                      {items.map((p, index) => {
                        const status = statusOf(p);
                        const meta = STATUS_META[status];
                        const isEditing = editingId === p.id;
                        const age = daysSince(p.touchedAt);
                        const stale = status !== "done" && age !== null && age >= STALE_DAYS;
                        const isDropItem = dropTarget === "item:" + p.id;
                        return (
                          <div
                            key={p.id}
                            draggable={!isEditing}
                            onDragStart={(e) => { e.stopPropagation(); setDragItem(p.id); e.dataTransfer.effectAllowed = "move"; }}
                            onDragOver={(e) => { if (!dragItem) return; e.preventDefault(); e.stopPropagation(); setDropTarget("item:" + p.id); }}
                            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropItemOnItem(p.id); endDrag(); }}
                            onDragEnd={endDrag}
                            className="prio-item"
                            style={{
                              ...cardStyle,
                              padding: "6px 8px",
                              borderRadius: 8,
                              boxShadow: "none",
                              display: "flex",
                              flexDirection: "column",
                              opacity: dragItem === p.id ? 0.4 : status === "done" ? 0.6 : 1,
                              cursor: isEditing ? "default" : "grab",
                              border: undefined, borderLeft: SIDE, borderRight: SIDE, borderBottom: SIDE,
                              borderTop: isDropItem ? `2px solid ${color}` : SIDE,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <GripVertical size={13} color="#D6D3D1" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#A8A29E", width: 12, textAlign: "right", flexShrink: 0 }}>{index + 1}</span>
                              <button
                                onClick={() => updateItem(p.id, { status: meta.next })}
                                title={`${meta.label} · click for ${STATUS_META[meta.next].label}`}
                                style={{
                                  width: 14, height: 14, borderRadius: 7, flexShrink: 0, cursor: "pointer", padding: 0,
                                  border: `2px solid ${meta.color}`, background: status === "done" || status === "top" ? meta.color : status === "pending" ? meta.bg : "#fff",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}
                              >
                                {status === "pending" && <span style={{ width: 4, height: 4, borderRadius: 2, background: meta.color }} />}
                              </button>

                              {isEditing ? (
                                <input
                                  autoFocus
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onBlur={() => { if (editText.trim() && editText.trim() !== p.text) updateItem(p.id, { text: editText.trim() }); setEditingId(null); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingId(null); }}
                                  style={{ ...inputStyle, fontSize: 12, padding: "3px 6px", flex: 1, minWidth: 0 }}
                                />
                              ) : (
                                <span
                                  onDoubleClick={() => setNoteId(p.id)}
                                  title="Double-click to open notes"
                                  style={{
                                    fontSize: 12, fontWeight: 600, color: "#1C1917", flex: 1, minWidth: 0,
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    textDecoration: status === "done" ? "line-through" : "none",
                                  }}
                                >
                                  {p.text}
                                </span>
                              )}

                              {p.notes?.trim() && (
                                <span title="Has notes" style={{ display: "flex", flexShrink: 0 }}><StickyNote size={11} color="#A8A29E" /></span>
                              )}
                              {(status === "pending" || status === "top") && (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 6, background: meta.bg, color: meta.color, flexShrink: 0 }}>{status === "top" ? "TOP" : "PENDING"}</span>
                              )}
                              {stale && (
                                <span title={`Untouched for ${age} days`} style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 6, background: "#FFFBEB", color: "#B45309", flexShrink: 0 }}>{age}d</span>
                              )}
                              <button
                                className="prio-item-btn"
                                onClick={() => { if (window.confirm(`Delete "${p.text}"?`)) deleteItem(p.id); }}
                                style={{ ...iconBtn, color: "#EF4444" }}
                                title="Delete"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                          </div>
                        );
                      })}
                      {cat && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px" }}>
                          <Plus size={11} color={color} style={{ flexShrink: 0, opacity: 0.7 }} />
                          <input
                            ref={(el) => { subRefs.current[id] = el; }}
                            placeholder={`Add to ${cat.name}…`}
                            value={subText[id] || ""}
                            onChange={(e) => setSubText((m) => ({ ...m, [id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") addSubs(id, subText[id] || ""); if (e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                            style={{ ...inputStyle, fontSize: 12, padding: "3px 2px", border: "none", background: "transparent", flex: 1, minWidth: 0 }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          {/* ── New category (always available) ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 8, border: "1px dashed #E7E5E4" }}>
            <Plus size={13} color="#A8A29E" style={{ flexShrink: 0 }} />
            <input
              ref={newCatRef}
              placeholder="New category"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleNewCategory(); if (e.key === "Escape") { setNewCatName(""); (e.target as HTMLInputElement).blur(); } }}
              style={{ ...inputStyle, fontSize: 11, fontWeight: 700, padding: "4px 2px", border: "none", background: "transparent", flex: 1, minWidth: 0 }}
            />
          </div>
        </>
      )}

      {noteItem && (
        <PriorityNoteModal
          item={noteItem}
          categories={categories}
          inputStyle={inputStyle}
          onClose={() => setNoteId(null)}
          onSave={(patch) => { updateItem(noteItem.id, patch); setNoteId(null); }}
          onDelete={() => { if (window.confirm(`Delete "${noteItem.text}"?`)) { deleteItem(noteItem.id); setNoteId(null); } }}
        />
      )}

      <style>{`
        .prio-cat .prio-cat-btn, .prio-item .prio-item-btn { opacity: 0; transition: opacity .1s; }
        .prio-cat:hover .prio-cat-btn, .prio-item:hover .prio-item-btn { opacity: 1; }
        @media (hover: none) { .prio-cat .prio-cat-btn, .prio-item .prio-item-btn { opacity: 1; } }
      `}</style>
    </div>
  );
}

/* ─── Notes modal (double-click an item) ─── */
function PriorityNoteModal({
  item, categories, inputStyle, onClose, onSave, onDelete,
}: {
  item: Priority;
  categories: PriorityCategory[];
  inputStyle: React.CSSProperties;
  onClose: () => void;
  onSave: (patch: Partial<Priority>) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(item.text);
  const [notes, setNotes] = useState(item.notes || "");
  const [categoryId, setCategoryId] = useState(item.categoryId || categories[0]?.id);
  const [status, setStatus] = useState<Status>(toStatus(item.status));

  const dirty = text.trim() !== item.text || notes !== (item.notes || "") || categoryId !== item.categoryId || status !== toStatus(item.status);
  const save = () => {
    if (!dirty) return onClose();
    onSave({ text: text.trim() || item.text, notes: notes.trim() ? notes : undefined, categoryId, status });
  };

  const color = categories.find((c) => c.id === categoryId)?.color || "#2563EB";

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) save(); }}
      onKeyDown={(e) => { if (e.key === "Escape") save(); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(28,25,23,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, boxShadow: "0 20px 50px rgba(28,25,23,0.25)", borderTop: `4px solid ${color}`, display: "flex", flexDirection: "column", gap: 12, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ ...inputStyle, fontSize: 16, fontWeight: 700, border: "none", background: "transparent", padding: "2px 0", flex: 1, minWidth: 0 }}
          />
          <button onClick={save} title="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E", display: "flex" }}><X size={16} /></button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", width: "auto" }}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {STATUS_ORDER.map((k) => (
            <button
              key={k}
              onClick={() => setStatus(k)}
              style={{
                fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${status === k ? STATUS_META[k].color : "#E7E5E4"}`,
                background: status === k ? STATUS_META[k].bg : "#fff", color: status === k ? STATUS_META[k].color : "#78716C",
              }}
            >
              {STATUS_META[k].label}
            </button>
          ))}
        </div>

        <textarea
          autoFocus
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          rows={9}
          style={{ ...inputStyle, fontSize: 13, lineHeight: 1.5, padding: "10px 12px", resize: "vertical", minHeight: 160 }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <Trash2 size={12} /> Delete
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 10, color: "#A8A29E" }}>{item.touchedAt ? `Updated ${new Date(item.touchedAt).toLocaleDateString()}` : ""}</span>
            <button onClick={save} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#1C1917", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {dirty ? "Save" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
