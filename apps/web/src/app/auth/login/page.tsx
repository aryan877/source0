"use client";

import { LoginButton } from "@/components/auth/login-button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-divider bg-content1 p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Welcome back</h2>
          <p className="mt-2 text-default-600">Sign in to your account</p>
        </div>

        <LoginButton />
      </div>
    </div>
  );
}
