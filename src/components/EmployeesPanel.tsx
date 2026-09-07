"use client";
import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Users } from "lucide-react";
import { AppState, Employee } from "@/lib/types";

const AVATAR_COLORS = [
  "#2563EB", "#8B5CF6", "#EC4899", "#EF4444",
  "#F59E0B", "#10B981", "#06B6D4", "#7C3AED",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function EmployeesPanel({
  state,
  onSave,
}: {
  state: AppState;
  onSave: (s: AppState) => void;
}) {
  const employees: Employee[] = state.employees || [];

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const addEmployee = () => {
    const name = newName.trim();
    if (!name) return;
    const emp: Employee = { id: "emp_" + Date.now(), name };
    onSave({ ...state, employees: [...employees, emp] });
    setNewName("");
  };

  const deleteEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (!window.confirm(`Delete "${emp?.name || "this employee"}"? Tasks and meetings that already reference them will keep the old name.`)) return;
    onSave({ ...state, employees: employees.filter((e) => e.id !== id) });
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditName(emp.name);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    onSave({
      ...state,
      employees: employees.map((e) =>
        e.id === editingId ? { ...e, name: editName.trim() } : e
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
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#8B5CF6,#EC4899)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Users size={18} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>Employees</h1>
          <p style={{ fontSize: 12, color: "#A8A29E", marginTop: 2 }}>
            {employees.length} employee{employees.length !== 1 ? "s" : ""} — these appear in the @ dropdown when assigning tasks
          </p>
        </div>
      </div>

      {/* Add new */}
      <div style={{ ...card, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E", marginBottom: 12 }}>Add Employee</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addEmployee(); }}
            placeholder="Employee name…"
            style={{
              flex: 1, fontSize: 13, padding: "9px 12px", borderRadius: 9,
              border: "1px solid #E7E5E4", background: "#FAFAF9",
              color: "#1C1917", outline: "none",
            }}
          />
          <button
            onClick={addEmployee}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 9,
              background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
              color: "#fff", fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer", flexShrink: 0,
              boxShadow: "0 2px 8px rgba(139,92,246,0.25)",
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* List */}
      {employees.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#A8A29E" }}>
          <Users size={36} style={{ margin: "0 auto 12px", opacity: 0.25 }} />
          <p style={{ fontSize: 13 }}>No employees yet. Add one above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {employees.map((emp) => {
            const color = avatarColor(emp.name);
            return (
              <div
                key={emp.id}
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
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {initials(emp.name)}
                </div>

                {editingId === emp.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                      style={{
                        flex: 1, fontSize: 13, padding: "6px 10px", borderRadius: 8,
                        border: "1.5px solid #8B5CF6", background: "#F5F3FF",
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
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#1C1917" }}>{emp.name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: "#8B5CF6",
                      background: "#F5F3FF", padding: "2px 8px", borderRadius: 20,
                    }}>
                      @{emp.name}
                    </span>
                    <button
                      onClick={() => startEdit(emp)}
                      style={{ padding: 6, borderRadius: 8, opacity: 0.5, cursor: "pointer", transition: "opacity 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                    >
                      <Pencil size={13} color="#78716C" />
                    </button>
                    <button
                      onClick={() => deleteEmployee(emp.id)}
                      style={{ padding: 6, borderRadius: 8, opacity: 0.4, cursor: "pointer", transition: "opacity 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
                    >
                      <Trash2 size={13} color="#EF4444" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
