export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import type { AssistantContext } from "@/lib/assistant";
import { MODEL, SCHEMA, systemPrompt } from "@/lib/assistantPrompt";

// Turns one instruction ("add a meeting with Yahya on Tuesday at 3") into actions.
// The browser applies them, so this route never touches the database.
// Only signed-in users can call it, so the Gemini key can't be used by anyone else.

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server" }, { status: 500 });

  let body: { message?: string; context?: AssistantContext };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }
  const message = (body.message || "").trim().slice(0, 2000);
  if (!message || !body.context) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(body.context) }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.1 },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Gemini error", data?.error);
      return NextResponse.json({ error: data?.error?.message || "AI request failed" }, { status: 502 });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "{}";
    const parsed = JSON.parse(text);
    return NextResponse.json({ reply: String(parsed.reply || ""), actions: Array.isArray(parsed.actions) ? parsed.actions : [] });
  } catch (err) {
    console.error("Assistant failed", err);
    return NextResponse.json({ error: "Assistant failed" }, { status: 500 });
  }
}
