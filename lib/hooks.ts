"use client";

/**
 * `useAppUser` now lives in the AuthProvider context (lib/auth-context.tsx) so
 * user + profile are fetched once per session instead of once per page.
 * Re-exported here to keep existing import paths working.
 */
export { useAppUser, AuthProvider, type AuthStatus } from "@/lib/auth-context";
