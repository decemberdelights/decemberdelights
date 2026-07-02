import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", "franchise_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return response;
}
