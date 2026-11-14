export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/serverAuth';

// We store the entire state in a single row for now to maintain compatibility
// with the existing frontend store logic.
const STATE_ROW_ID = 1;

// Every request must carry the signed-in user's Supabase access token.
// The database is then queried as that user, not with the public anon key.
export async function GET(req: Request) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const supabase = auth.db;

  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('state')
      .eq('id', STATE_ROW_ID)
      .single();

    if (error) {
      // If no data found, return null and the store will use defaults
      if (error.code === 'PGRST116') return NextResponse.json(null);
      throw error;
    }

    return NextResponse.json(data.state);
  } catch (err) {
    // Must be an error, not `null`: a null body means "no saved state yet", and the
    // client would then fall back to its local cache and save it over the real data.
    console.error("Failed to read from Supabase", err);
    return NextResponse.json({ error: "Failed to read state" }, { status: 500 });
  }
}

// Saves are guarded by a revision number (state._rev). Each tab/device sends the
// revision it last loaded; if the stored revision has moved on (another tab or
// device saved in between), the write is refused with 409 and the newer state is
// returned, instead of silently overwriting it with stale data.
export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  const supabase = auth.db;

  try {
    const data = await req.json();
    const baseRev: number | undefined = typeof data._rev === "number" ? data._rev : undefined;

    const { data: current, error: readErr } = await supabase
      .from('app_state')
      .select('state')
      .eq('id', STATE_ROW_ID)
      .maybeSingle();
    if (readErr) throw readErr;

    const currentRev: number = typeof current?.state?._rev === "number" ? current.state._rev : 0;

    // Clients that don't send a revision (older tabs still open) keep the old behaviour.
    if (baseRev !== undefined && current?.state && baseRev !== currentRev) {
      return NextResponse.json(
        { success: false, conflict: true, rev: currentRev, state: current.state },
        { status: 409 }
      );
    }

    const nextRev = currentRev + 1;
    const { error } = await supabase
      .from('app_state')
      .upsert({ id: STATE_ROW_ID, state: { ...data, _rev: nextRev } });

    if (error) throw error;

    return NextResponse.json({ success: true, rev: nextRev });
  } catch (err) {
    console.error("Failed to write to Supabase", err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
