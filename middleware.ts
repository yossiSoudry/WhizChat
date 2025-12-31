import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CORS headers for widget embed
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/chat", "/api/webhook", "/api/cron"];

// Routes that require admin role
const adminOnlyRoutes = ["/agents", "/api/admin/agents"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS for /api/chat/* routes (widget API)
  if (pathname.startsWith("/api/chat")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Skip auth for public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Create Supabase client for session management
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Check authentication for protected routes
  const isProtectedRoute =
    pathname.startsWith("/api/admin") ||
    (!pathname.startsWith("/api") && !pathname.startsWith("/_next"));

  if (isProtectedRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // No user - redirect to login or return 401
    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For admin routes, we'll check the role in the API handler
    // (can't access Prisma in Edge middleware)
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files, images, and JS files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|json)$).*)",
  ],
};
