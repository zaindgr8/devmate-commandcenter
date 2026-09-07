"use client";
import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Folders } from "lucide-react";
import { AppState, Project } from "@/lib/types";

const PRESET_COLORS = [
  "#2563EB", "#8B5CF6", "#EC4899", "#EF4444",
  "#F59E0B", "#10B981", "#06B6D4", "#64748B",
  "#7C3AED", "#D97706", "#059669", "#DC2626",
];

function randomColor() {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

export default function ProjectsPanel({
  state,
  onSave,
}: {
  state: AppState;
  onSave: (s: AppState) => void;
}) {
  const projects: Project[] = state.projects || [];

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(randomColor());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [showColorPicker, setShowColorPicker] = useState<"new" | string | null>(null);

  const addProject = () => {
    const name = newName.trim();
    if (!name) return;
    const project: Project = { id: "proj_" + Date.now(), name, color: newColor };
    onSave({ ...state, projects: [...projects, project] });
    setNewName("");
    setNewColor(randomColor());
  };

  const deleteProject = (id: string) => {
    const p = projects.find((pr) => pr.id === id);
    if (!window.confirm(`Delete the project "${p?.name || "this project"}"? Tasks and meetings that already reference it will keep the old name.`)) return;
    onSave({ ...state, projects: projects.filter((p) => p.id !== id) });
  };

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditColor(p.color);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    onSave({
      ...state,
      projects: projects.map((p) =>
        p.id === editingId ? { ...p, name: editName.trim(), color: editColor } : p
      ),
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #F0EEEC",
    boxShadow: "0 1px 2px rgba(28,25,23,0.04)",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#2563EB,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Folders size={18} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Projects</h1>
          <p style={{ fontSize: 12, color: "#A8A29E", marginTop: 2 }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""} — these appear in the @ dropdown when assigning tasks
          </p>
        </div>
      </div>

      {/* Add new */}
      <div style={{ ...card, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E", marginBottom: 12 }}>New Project</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Colour swatch */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowColorPicker(showColorPicker === "new" ? null : "new")}
              title="Pick colour"
              style={{
                width: 36, height: 36, borderRadius: 10, background: newColor,
                border: "2px solid #E7E5E4", cursor: "pointer", flexShrink: 0,
                boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              }}
            />
            {showColorPicker === "new" && (
              <div style={{
                position: "absolute", top: 44, left: 0, zIndex: 100,
                background: "#fff", borderRadius: 12, border: "1px solid #E7E5E4",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 10,
                display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6,
              }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setNewColor(c); setShowColorPicker(null); }}
                    style={{
                      width: 24, height: 24, borderRadius: 6, background: c,
                      border: newColor === c ? "2.5px solid #1C1917" : "2px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addProject(); }}
            placeholder="Project name…"
            style={{
              flex: 1, fontSize: 13, padding: "9px 12px", borderRadius: 9,
              border: "1px solid #E7E5E4", background: "#FAFAF9",
              color: "#1C1917", outline: "none",
            }}
          />
          <button
            onClick={addProject}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 9,
              background: "linear-gradient(135deg,#2563EB,#7C3AED)",
              color: "#fff", fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer", flexShrink: 0,
              boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* List */}
      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#A8A29E" }}>
          <Folders size={36} style={{ margin: "0 auto 12px", opacity: 0.25 }} />
          <p style={{ fontSize: 13 }}>No projects yet. Add one above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((p) => (
            <div
              key={p.id}
              style={{
                ...card,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(28,25,23,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 2px rgba(28,25,23,0.04)")}
            >
              {editingId === p.id ? (
                <>
                  {/* Edit colour */}
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setShowColorPicker(showColorPicker === p.id ? null : p.id)}
                      style={{
                        width: 28, height: 28, borderRadius: 8, background: editColor,
                        border: "2px solid #E7E5E4", cursor: "pointer", flexShrink: 0,
                      }}
                    />
                    {showColorPicker === p.id && (
                      <div style={{
                        position: "absolute", top: 36, left: 0, zIndex: 100,
                        background: "#fff", borderRadius: 12, border: "1px solid #E7E5E4",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 10,
                        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6,
                      }}>
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => { setEditColor(c); setShowColorPicker(null); }}
                            style={{
                              width: 24, height: 24, borderRadius: 6, background: c,
                              border: editColor === c ? "2.5px solid #1C1917" : "2px solid transparent",
                              cursor: "pointer",
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                    style={{
                      flex: 1, fontSize: 13, padding: "6px 10px", borderRadius: 8,
                      border: "1.5px solid #2563EB", background: "#EFF6FF",
                      color: "#1C1917", outline: "none",
                    }}
                  />
                  <button onClick={saveEdit} style={{ padding: 6, borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", cursor: "pointer" }}>
                    <Check size={14} color="#16A34A" />
                  </button>
                  <button onClick={cancelEdit} style={{ padding: 6, borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", cursor: "pointer" }}>
                    <X size={14} color="#EF4444" />
                  </button>
                </>
              ) : (
                <>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#1C1917" }}>{p.name}</span>
                  <div style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                    background: p.color + "18", color: p.color, letterSpacing: 0.4,
                  }}>
                    Project
                  </div>
                  <button
                    onClick={() => startEdit(p)}
                    style={{ padding: 6, borderRadius: 8, opacity: 0.5, cursor: "pointer", transition: "opacity 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                  >
                    <Pencil size={13} color="#78716C" />
                  </button>
                  <button
                    onClick={() => deleteProject(p.id)}
                    style={{ padding: 6, borderRadius: 8, opacity: 0.4, cursor: "pointer", transition: "opacity 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
                  >
                    <Trash2 size={13} color="#EF4444" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
