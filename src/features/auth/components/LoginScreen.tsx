"use client";

import { AuthShell } from "@/features/auth/components/AuthShell";
import { AuthTrustPanel } from "@/features/auth/components/AuthTrustPanel";
import { SignIn } from "@/features/auth/components/SignIn";

export function LoginScreen() {
  return (
    <AuthShell side={<AuthTrustPanel />}>
      <SignIn />
    </AuthShell>
  );
}
