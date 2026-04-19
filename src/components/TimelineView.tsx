"use client";
import { MainTask } from "@/lib/types";

const BAR_BG: Record<string, string> = { not_started: "#E7E5E4", doing: "#D97706", done: "#16A34A" };
const BAR_FG: Record<string, string> = { not_started: "#78716C", doing: "#fff", done: "#fff" };

const START_MIN = 7 * 60; // 7 AM
const RANGE = 24 * 60; // 24 Hours

function getMinRange(t: MainTask) {
  const [h1, m1] = t.from.split(":").map(Number);
  const [h2, m2] = t.to.split(":").map(Number);
  
  let s = h1 * 60 + m1;
  let e = h2 * 60 + m2;
  
  if (s < START_MIN) s += 24 * 60;
  if (e < s || (e === START_MIN && s > START_MIN)) e += 24 * 60;
  
  return { s, e };
}

function format12(h: number) {
  const act = h % 24;
  const ampm = act >= 12 ? 'PM' : 'AM';
  const disp = act % 12 || 12;
  return `${disp} ${ampm}`;
}

export default function TimelineView({ tasks }: { tasks: MainTask[] }) {
  const hrs: number[] = [];
  for (let h = 7; h <= 31; h += 2) hrs.push(h);

  // Calculate free time blocks
  const intervals = tasks.map(t => getMinRange(t)).sort((a,b) => a.s - b.s);
  const merged: {s: number, e: number}[] = [];
  for (const iv of intervals) {
    if (!merged.length) merged.push(iv);
    else {
      const prev = merged[merged.length - 1];
      if (iv.s <= prev.e) prev.e = Math.max(prev.e, iv.e);
      else merged.push(iv);
    }
  }
  
  const freeBlocks = [];
  let curr = START_MIN;
  for (const m of merged) {
    if (m.s > curr) freeBlocks.push({ s: curr, e: m.s });
    curr = Math.max(curr, m.e);
  }
  if (curr < START_MIN + RANGE) freeBlocks.push({ s: curr, e: START_MIN + RANGE });

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #F0EEEC", boxShadow: "0 1px 2px rgba(28,25,23,0.04)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#A8A29E" }}>Day Timeline</span>
        <div style={{ display: "flex", gap: 14 }}>
          {[{ l: "Not Started", c: "#E7E5E4" }, { l: "Doing", c: "#D97706" }, { l: "Done", c: "#16A34A" }].map((x) => (
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} />
              <span style={{ fontSize: 10, color: "#A8A29E" }}>{x.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hour labels */}
      <div style={{ position: "relative", height: 16 }}>
        {hrs.map((h) => (
          <span key={h} style={{ position: "absolute", left: `${((h * 60 - START_MIN) / RANGE) * 100}%`, transform: "translateX(-50%)", fontSize: 9, color: "#A8A29E", fontWeight: 600, whiteSpace: "nowrap" }}>
            {format12(h)}
          </span>
        ))}
      </div>

      {/* Bars */}
      <div style={{ marginTop: 8 }}>
        {/* Render Free Blocks Row */}
        {freeBlocks.length > 0 && (
           <div style={{ position: "relative", height: 26, marginBottom: 8, background: "#FAFAF9", borderRadius: 6, border: "1px solid #F5F5F4" }}>
              {freeBlocks.map((b, i) => {
                 let left = ((b.s - START_MIN) / RANGE) * 100;
                 let width = ((b.e - b.s) / RANGE) * 100;
                 if (left < 0) { width += left; left = 0; }
                 if (left + width > 100) { width = 100 - left; }
                 if (width <= 0) return null;
                 return (
                   <div key={i} style={{
                     position: "absolute", left: `${left}%`, width: `${width}%`, top: 0, height: "100%",
                     display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #D6D3D1", borderRadius: 6,
                     overflow: "hidden"
                   }} />
                 )
              })}
           </div>
        )}

        {/* Render Task Rows */}
        {tasks.map((t) => {
          const { s, e } = getMinRange(t);
          let left = ((s - START_MIN) / RANGE) * 100;
          let width = ((e - s) / RANGE) * 100;
          
          if (left < 0) { width += left; left = 0; }
          if (left + width > 100) width = 100 - left;

          return (
            <div key={t.id} style={{ position: "relative", height: 24, marginBottom: 3 }}>
              {width > 0 && (
                <div
                  style={{
                    position: "absolute", left: `${left}%`, width: `${width}%`, top: 0, height: 22,
                    borderRadius: 6, background: BAR_BG[t.status], display: "flex", alignItems: "center",
                    paddingLeft: 8, paddingRight: 8, overflow: "hidden", transition: "all 0.3s",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                  }}
                  title={`${t.name}: ${t.from} – ${t.to}`}
                >
                  <span style={{ fontSize: 10, fontWeight: 600, color: BAR_FG[t.status], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                    {t.name}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
