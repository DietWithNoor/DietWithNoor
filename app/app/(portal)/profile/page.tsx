"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, LogOut, Loader2, ShieldCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAppUser } from "@/lib/auth-context";
import { signOut, updatePassword } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import {
  formatDate,
  clientIdLabel,
  ageFromDob,
  formatHeight,
  round1,
} from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, status } = useAppUser();

  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // The provider loads asynchronously, so seed the field once the user arrives.
  useEffect(() => {
    if (user) setPhone(user.phone_number ?? "");
  }, [user]);

  async function handleSavePhone() {
    if (!user) return;
    setError(null);
    setPhoneSaved(false);
    setSavingPhone(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("users").update({ phone_number: phone }).eq("id", user.id);
      if (err) throw err;
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your phone number");
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleChangePassword() {
    if (!newPassword) return;
    setError(null);
    setPasswordSaved(false);
    setSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setPasswordSaved(true);
      setNewPassword("");
      setTimeout(() => setPasswordSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await signOut();
    router.push("/app/login");
  }

  if (status === "loading" || !user) return <ProfileSkeleton />;

  const unit = profile?.weight_unit ?? "kg";
  const age = ageFromDob(profile?.date_of_birth);

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-3 pb-2 pt-2"
      >
        <Avatar className="h-20 w-20 text-2xl shadow-md">
          <AvatarFallback>{user.full_name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="font-display text-xl font-semibold tracking-tight">{user.full_name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
          <span className="mt-2 inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
            Client {clientIdLabel(user.user_number)}
          </span>
        </div>
      </motion.div>

      {user.role === "admin" && (
        <Card>
          <Link href="/app/admin" className="block rounded-lg transition-colors hover:bg-muted/40">
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.9} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Admin console</p>
                <p className="text-xs text-muted-foreground">Manage clients and export data</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Detail label="Age" value={age != null ? `${age} years` : "Not set"} />
            <Detail label="Height" value={formatHeight(profile?.height_cm)} />
            <Detail
              label="Current weight"
              value={profile?.current_weight != null ? `${round1(profile.current_weight)} ${unit}` : "Not set"}
            />
            <Detail
              label="Goal weight"
              value={profile?.goal_weight != null ? `${round1(profile.goal_weight)} ${unit}` : "Not set"}
            />
            <Detail
              label="Starting weight"
              value={profile?.starting_weight != null ? `${round1(profile.starting_weight)} ${unit}` : "Not set"}
            />
            <Detail
              label="Target date"
              value={profile?.goal_target_date ? formatDate(profile.goal_target_date) : "No date set"}
            />
            <Detail label="Tracking streak" value={`${profile?.tracking_streak ?? 0} days`} />
            <Detail label="Joined" value={formatDate(user.created_at)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {error && <InlineError message={error} />}

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
              />
              <Button variant="outline" onClick={handleSavePhone} disabled={savingPhone} className="shrink-0">
                {savingPhone ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : phoneSaved ? (
                  <Check className="h-4 w-4 text-fresh" />
                ) : null}
                {phoneSaved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <div className="flex gap-2">
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              <Button
                variant="outline"
                onClick={handleChangePassword}
                disabled={savingPassword || newPassword.length < 6}
                className="shrink-0"
              >
                {savingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : passwordSaved ? (
                  <Check className="h-4 w-4 text-fresh" />
                ) : null}
                {passwordSaved ? "Updated" : "Update"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full text-destructive" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Log out
      </Button>

      <p className="pb-2 text-center text-xs text-muted-foreground">Diet With Noor · Client Portal</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 pb-2 pt-2">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      {[0, 1].map((card) => (
        <div key={card} className="rounded-lg border bg-card p-5 shadow-sm">
          <Skeleton className="h-4 w-28" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  );
}
