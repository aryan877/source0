import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { type Database } from "@/types/supabase-types";

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

/**
 * Update session middleware for Next.js
 * This ensures that the user's auth session is properly refreshed on each request
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create an initial response - this will be modified by the Supabase client
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Create Supabase client with proper cookie handling
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the request for subsequent middleware/route handlers
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          // Create a new response with the updated cookies
          supabaseResponse = NextResponse.next({
            request,
          });

          // Set cookies on the response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Get session using getUser() which validates the JWT
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Handle protected routes
  if (isProtectedRoute(pathname)) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/auth/login";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Handle auth routes (redirect authenticated users to home)
  if (isAuthRoute(pathname)) {
    if (user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!
  return supabaseResponse;
}
