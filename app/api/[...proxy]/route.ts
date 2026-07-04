import { NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || process.env.BACKEND_URL || "http://localhost:5000";
if (!FASTAPI_URL) {
  console.warn("FASTAPI_URL environment variable is not set");
}

const ALLOWED_PATHS = ["menu", "products", "jobs", "franchise", "careers", "contact", "orders", "health"];
const BLOCKED_INTERNAL = ["169.254.169.254"];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((p) => path.startsWith(p + "/") || path === p);
}

function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return BLOCKED_INTERNAL.some((block) => parsed.hostname === block);
  } catch {
    return true;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function POST(request: Request, { params }: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function PUT(request: Request, { params }: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ proxy: string[] }> }) {
  return proxyRequest(request, await params);
}

async function proxyRequest(request: Request, { proxy }: { proxy: string[] }) {
  if (!FASTAPI_URL) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  const path = proxy.join("/");

  if (!isAllowedPath(path)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const targetUrl = `${FASTAPI_URL}/api/${path}${url.search ? `?${url.searchParams}` : ""}`;

  if (isInternalUrl(targetUrl)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const headers = new Headers();
  const allowedHeaders = ["content-type", "authorization", "accept"];
  request.headers.forEach((value, key) => {
    if (allowedHeaders.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  try {
    const body = request.method !== "GET" && request.method !== "HEAD"
      ? await request.arrayBuffer()
      : undefined;

    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const resHeaders = new Headers();
    const safeHeaders = ["content-type", "cache-control", "etag"];
    res.headers.forEach((value, key) => {
      if (safeHeaders.includes(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    const responseBody = await res.arrayBuffer();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: resHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Backend service unavailable" },
      { status: 502 }
    );
  }
}
