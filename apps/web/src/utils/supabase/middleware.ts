import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Configuration for protected routes
const PROTECTED_ROUTES = ["/chat"];

// Configuration for public routes that should bypass protection even if they match protected routes
const PUBLIC_ROUTES = ["/chat/shared"];

// Configuration for auth routes (redirect to home if already logged in)
const AUTH_ROUTES = ["/auth/login"];

// Helper function to check if path matches protected routes
const isProtectedRoute = (pathname: string): boolean => {
  // First check if it's a public route that should bypass protection
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublicRoute) {
    return false;
  }

  // Then check if it matches any protected routes
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
};

// Helper function to check if path is an auth route
const isAuthRoute = (pathname: string): boolean => {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
};

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
      },
    }
  );

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Handle protected routes
  if (isProtectedRoute(pathname)) {
    if (!session) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth/login";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Handle auth routes (redirect authenticated users to home)
  if (isAuthRoute(pathname)) {
    if (session) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Allow request to continue
  return NextResponse.next();
}
