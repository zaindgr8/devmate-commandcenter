// Server-only: model, response schema and system prompt for /api/assistant.
import type { AssistantContext } from "./assistant";

export const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

export const SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING", description: "One short sentence back to the user. Ask a question here only if the request is impossible to act on." },
    actions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["add_task", "add_meeting", "add_event", "add_priority", "add_note", "add_content_idea"] },
          date: { type: "STRING", description: "YYYY-MM-DD" },
          time: { type: "STRING", description: "24h HH:mm" },
          title: { type: "STRING" },
          text: { type: "STRING" },
          group: { type: "STRING" },
          project: { type: "STRING" },
          people: { type: "ARRAY", items: { type: "STRING" } },
          location: { type: "STRING" },
          category: { type: "STRING", description: "Ours | Others | Imp, or empty" },
          weekly: { type: "BOOLEAN" },
          platform: { type: "STRING", description: "Instagram | YouTube | LinkedIn, or empty" },
          link: { type: "STRING" },
        },
        // Every field is required ("" / [] / false when not used): Flash otherwise drops optional fields.
        required: ["type", "date", "time", "title", "text", "group", "project", "people", "location", "category", "weekly", "platform", "link"],
      },
    },
  },
  required: ["reply", "actions"],
};

export function systemPrompt(ctx: AssistantContext) {
  return `You are the assistant inside a personal command-center app. Turn the user's instruction into actions. Do not invent anything the user did not ask for.

Today is ${ctx.weekday} ${ctx.today}. The user is viewing ${ctx.viewingDate}. Resolve relative dates ("tomorrow", "next Tuesday", "on the 28th") to YYYY-MM-DD. If no date is given, use ${ctx.viewingDate}. Times are 24h HH:mm.

Actions:
- add_task: a to-do. text = the task. group = the task card/project it belongs to (without @). Existing cards: ${ctx.taskGroups.join(", ") || "none"}. Match one of these when the user names it, even loosely ("sixty" → "SIXTY"). date = day to do it.
- add_meeting: project = who/what the meeting is with or about. people = attendees if named. date, time.
- add_event: title, date, time, location. category: "Ours" (we run it), "Others" (someone else's, default when attending), "Imp" (important). weekly=true if it repeats every week.
- add_priority: text = the name (client, venture…). group = its category. Existing categories: ${ctx.priorityCategories.map((c) => `${c.name} (${c.items.join(", ")})`).join("; ") || "none"}.
- add_note: attach a note. group = the client/priority name or task card it is about. text = the note.
- add_content_idea: title, platform (Instagram/YouTube/LinkedIn), link if given.

Known projects: ${ctx.projects.join(", ") || "none"}. Known people: ${ctx.employees.join(", ") || "none"}.
Fill every field of every action; use "" (or [] / false) for fields that do not apply. Always fill date, and fill time, people, location, platform and link whenever the user gives them.
One instruction can produce several actions. reply: confirm briefly what you did, no lists.`;
}

