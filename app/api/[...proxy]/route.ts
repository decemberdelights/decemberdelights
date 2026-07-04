import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "";

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
  if (!BACKEND_URL) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  const path = proxy.join("/");
  const url = new URL(request.url);
  const targetUrl = `${BACKEND_URL}/api/${path}${url.search ? `?${url.searchParams}` : ""}`;

  const headers = new Headers();
  const allowedHeaders = ["content-type", "authorization", "accept", "cookie"];
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
    const safeHeaders = ["content-type", "cache-control", "etag", "set-cookie"];
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
