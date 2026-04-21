"use client";
import React, { useMemo } from "react";
import { AppState } from "@/lib/types";
import { PenTool, CheckCircle2 } from "lucide-react";

export default function ContentCreationPanel({
  state,
  onSave,
}: {
  state: AppState;
  onSave: (s: AppState) => void;
}) {
  const postedDates = state.contentPostedDates || [];

  const toggleDate = (dateStr: string) => {
    let newDates;
    if (postedDates.includes(dateStr)) {
      newDates = postedDates.filter((d) => d !== dateStr);
    } else {
      newDates = [...postedDates, dateStr];
    }
    onSave({ ...state, contentPostedDates: newDates });
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  const monthName = today.toLocaleString("default", { month: "long" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday

  const days = useMemo(() => {
    const list = [];
    // Add empty slots for days before the 1st of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      list.push(null);
    }
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      // Format as YYYY-MM-DD
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      list.push({ day: i, dateStr });
    }
    return list;
  }, [year, month, daysInMonth, firstDayOfWeek]);

  const cardStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(12px)",
    borderRadius: 18,
    border: "1px solid rgba(240, 238, 236, 0.7)",
    boxShadow: "0 4px 20px rgba(28, 25, 23, 0.03), 0 1px 2px rgba(28, 25, 23, 0.02)",
    overflow: "hidden",
    padding: 20,
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={{ maxWidth: 480 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", marginBottom: 2 }}>
          Content Tracker
        </h1>
        <p style={{ fontSize: 12, color: "#78716C" }}>
          Track daily content posting. Click to toggle.
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1C1917" }}>
            {monthName} {year}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#16A34A", background: "#F0FDF4", padding: "4px 10px", borderRadius: 20, border: "1px solid #BBF7D0" }}>
            <PenTool size={12} />
            {postedDates.filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length} Posted
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          {/* Weekday Headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 8 }}>
            {weekDays.map((day) => (
              <div key={day} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#A8A29E" }}>
                {day[0]}
              </div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {days.map((item, index) => {
              if (!item) {
                return <div key={`empty-${index}`} style={{ aspectRatio: "1/1" }} />;
              }

              const { day, dateStr } = item;
              const isPosted = postedDates.includes(dateStr);
              const isToday = today.getDate() === day;

              return (
                <button
                  key={dateStr}
                  onClick={() => toggleDate(dateStr)}
                  title={isPosted ? "Mark as not posted" : "Mark as posted"}
                  style={{
                    aspectRatio: "1/1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    borderRadius: 10,
                    border: isPosted ? "2px solid #22C55E" : (isToday ? "2px solid #E7E5E4" : "1px solid #F0EEEC"),
                    background: isPosted ? "#F0FDF4" : "#FAFAF9",
                    color: isPosted ? "#16A34A" : "#44403C",
                    cursor: "pointer",
                    transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!isPosted) {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPosted) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: isPosted || isToday ? 700 : 500 }}>
                    {day}
                  </span>
                  {isPosted && (
                    <CheckCircle2 size={12} color="#16A34A" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
