import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Proxy removed. API calls go directly to the backend." }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Proxy removed. API calls go directly to the backend." }, { status: 404 });
}

export async function PUT() {
  return NextResponse.json({ error: "Proxy removed. API calls go directly to the backend." }, { status: 404 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Proxy removed. API calls go directly to the backend." }, { status: 404 });
}
