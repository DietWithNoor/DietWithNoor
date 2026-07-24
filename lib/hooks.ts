"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppUser, Profile } from "@/types/index";

export function useAppUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        if (active) setLoading(false);
        return;
      }

      const [{ data: appUser }, { data: profileData }] = await Promise.all([
        supabase.from("users").select("*").eq("id", authUser.id).single(),
        supabase.from("profiles").select("*").eq("user_id", authUser.id).single(),
      ]);

      if (active) {
        setUser(appUser ?? null);
        setProfile(profileData ?? null);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return { user, profile, loading, setProfile };
}
