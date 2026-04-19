import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const data = await kv.get('devmate_app_state');
    if (data) {
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("Failed to read from KV", err);
  }
  return NextResponse.json(null);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    await kv.set('devmate_app_state', data);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to write to KV", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
