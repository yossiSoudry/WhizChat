import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CORS headers for widget embed
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS for /api/chat/* routes (widget API)
  if (pathname.startsWith("/api/chat")) {
    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Add CORS headers to response
    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/chat/:path*"],
};
