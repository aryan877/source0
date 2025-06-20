import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to home page (main chat) after successful login
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Redirect to login page if something went wrong
  return NextResponse.redirect(`${origin}/auth/login`);
}
