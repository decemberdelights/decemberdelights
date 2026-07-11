import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://localhost:4000";

async function proxyRequest(req: NextRequest, method: string) {
  const url = new URL(req.url);
  const backendUrl = `${BACKEND}${url.pathname}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key === "host" || key === "connection") return;
    headers.set(key, value);
  });
  headers.set("host", new URL(BACKEND).host);

  const init: RequestInit = { method, headers };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(backendUrl, init);
    const resHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (key === "transfer-encoding") return;
      resHeaders.set(key, value);
    });
    return new NextResponse(res.body, { status: res.status, statusText: res.statusText, headers: resHeaders });
  } catch (err) {
    return NextResponse.json({ detail: "Backend connection failed" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) { return proxyRequest(req, "GET"); }
export async function POST(req: NextRequest) { return proxyRequest(req, "POST"); }
export async function PUT(req: NextRequest) { return proxyRequest(req, "PUT"); }
export async function DELETE(req: NextRequest) { return proxyRequest(req, "DELETE"); }
export async function PATCH(req: NextRequest) { return proxyRequest(req, "PATCH"); }
