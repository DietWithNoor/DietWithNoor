"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppUser } from "@/lib/hooks";
import { signOut, updatePassword } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { formatDate, clientIdLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile } = useAppUser();
  const [phone, setPhone] = useState(user?.phone_number ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSavePhone() {
    if (!user) return;
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("users").update({ phone_number: phone }).eq("id", user.id);
    if (err) setError(err.message);
    else setMessage("Phone number updated.");
  }

  async function handleChangePassword() {
    if (!newPassword) return;
    setError(null);
    setMessage(null);
    try {
      await updatePassword(newPassword);
      setMessage("Password updated.");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    }
  }

  async function handleLogout() {
    await signOut();
    router.push("/app/login");
  }

  if (!user) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 pt-4">
        <Avatar className="h-20 w-20 text-2xl">
          <AvatarFallback>{user.full_name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="text-lg font-bold">{user.full_name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-5 text-sm">
          <div>
            <p className="text-muted-foreground">Client ID</p>
            <p className="font-semibold">{clientIdLabel(user.user_number)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Joined</p>
            <p className="font-semibold">{formatDate(user.created_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Weight</p>
            <p className="font-semibold">
              {profile?.current_weight ?? "--"} {profile?.weight_unit ?? "kg"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Streak</p>
            <p className="font-semibold">{profile?.tracking_streak ?? 0} days</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <FormMessage error={error} success={message} />
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2">
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Button variant="outline" onClick={handleSavePhone}>
                Save
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="flex gap-2">
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button variant="outline" onClick={handleChangePassword}>
                Update
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        Log Out
      </Button>
    </div>
  );
}
