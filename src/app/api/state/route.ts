import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// We store the entire state in a single row for now to maintain compatibility 
// with the existing frontend store logic.
const STATE_ROW_ID = 1;

export async function GET() {
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
    console.error("Failed to read from Supabase", err);
    return NextResponse.json(null);
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Use upsert to update the single state row
    const { error } = await supabase
      .from('app_state')
      .upsert({ id: STATE_ROW_ID, state: data });

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to write to Supabase", err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
