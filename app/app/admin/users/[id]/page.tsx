"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate, clientIdLabel } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import type { AppUser, Profile, WeightLog, WaterLog, SleepLog, MoodLog, ActivityLog } from "@/types/index";

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [u, p, w, water, sleep, mood, activity] = await Promise.all([
        supabase.from("users").select("*").eq("id", userId).single(),
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("weight_logs").select("*").eq("user_id", userId).order("logged_at", { ascending: false }),
        supabase.from("water_logs").select("*").eq("user_id", userId).order("date", { ascending: false }),
        supabase.from("sleep_logs").select("*").eq("user_id", userId).order("date", { ascending: false }),
        supabase.from("mood_logs").select("*").eq("user_id", userId).order("date", { ascending: false }),
        supabase.from("activity_logs").select("*").eq("user_id", userId).order("date", { ascending: false }),
      ]);
      setUser(u.data);
      setProfile(p.data);
      setWeightLogs(w.data ?? []);
      setWaterLogs(water.data ?? []);
      setSleepLogs(sleep.data ?? []);
      setMoodLogs(mood.data ?? []);
      setActivityLogs(activity.data ?? []);
    })();
  }, [userId]);

  if (!user) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">
          {user.full_name} <span className="text-muted-foreground font-normal">{clientIdLabel(user.user_number)}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="weight">Weight History</TabsTrigger>
          <TabsTrigger value="wellness">Wellness</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-5 text-sm">
              <div><p className="text-muted-foreground">Joined</p><p className="font-semibold">{formatDate(user.created_at)}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p className="font-semibold">{user.phone_number ?? "--"}</p></div>
              <div><p className="text-muted-foreground">Current Weight</p><p className="font-semibold">{profile?.current_weight ?? "--"} {profile?.weight_unit}</p></div>
              <div><p className="text-muted-foreground">Streak</p><p className="font-semibold">{profile?.tracking_streak ?? 0} days</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weight">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Weight</TableHead></TableRow></TableHeader>
            <TableBody>
              {weightLogs.map((l) => (
                <TableRow key={l.id}><TableCell>{formatDate(l.logged_at)}</TableCell><TableCell>{l.weight} {l.unit}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="wellness">
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Water</h3>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Glasses</TableHead></TableRow></TableHeader>
                <TableBody>{waterLogs.map((l) => <TableRow key={l.id}><TableCell>{formatDate(l.date)}</TableCell><TableCell>{l.glasses}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Sleep</h3>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Hours</TableHead></TableRow></TableHeader>
                <TableBody>{sleepLogs.map((l) => <TableRow key={l.id}><TableCell>{formatDate(l.date)}</TableCell><TableCell>{l.hours}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Mood &amp; Energy</h3>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Mood</TableHead><TableHead>Energy</TableHead></TableRow></TableHeader>
                <TableBody>{moodLogs.map((l) => <TableRow key={l.id}><TableCell>{formatDate(l.date)}</TableCell><TableCell>{l.mood}</TableCell><TableCell>{l.energy_level}/10</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Activity Level</TableHead></TableRow></TableHeader>
            <TableBody>{activityLogs.map((l) => <TableRow key={l.id}><TableCell>{formatDate(l.date)}</TableCell><TableCell className="capitalize">{l.activity_level}</TableCell></TableRow>)}</TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
