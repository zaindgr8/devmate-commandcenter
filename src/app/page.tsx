"use client";
import { useEffect, useState } from "react";
import { getSession, hasSupabaseSession, logout, AUTH_REQUIRED_EVENT } from "@/lib/store";
import LoginPage from "@/components/LoginPage";
import Dashboard from "@/components/Dashboard";
import type { User } from "@/lib/types";

export default function Home() {
  const [session, setSession] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    // The portal's data is only served to a real Supabase session, so the local
    // "remember me" record alone isn't enough to open the dashboard.
    (async () => {
      const local = getSession();
      const ok = local ? await hasSupabaseSession() : false;
      if (!alive) return;
      if (local && !ok) {
        await logout();
        setNotice("Please sign in again.");
      }
      setSession(ok ? local : null);
      setReady(true);
    })();

    const onAuthRequired = () => {
      logout();
      setNotice("Your session expired. Sign in again; edits made in the last few seconds may need redoing.");
      setSession(null);
    };
    window.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    };
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF9" }}>
        <p style={{ color: "#A8A29E", fontFamily: "'Fraunces', serif", fontSize: 18 }}>Loading...</p>
      </div>
    );
  }

  if (!session) return <LoginPage onLogin={(u) => { setNotice(""); setSession(u); }} notice={notice} />;
  return <Dashboard user={session} onLogout={() => setSession(null)} />;
}
