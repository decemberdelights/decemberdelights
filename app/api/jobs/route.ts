import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const jobs = db.prepare("SELECT * FROM jobs WHERE is_active = 1").all();
  return NextResponse.json(jobs);
}
