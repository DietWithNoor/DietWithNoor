import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppIndexPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/app/dashboard" : "/app/login");
}
