import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse(
    JSON.stringify({ error: "File uploads are served via Supabase Storage" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
