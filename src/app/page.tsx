"use client";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/store";
import LoginPage from "@/components/LoginPage";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF9" }}>
        <p style={{ color: "#A8A29E", fontFamily: "'Fraunces', serif", fontSize: 18 }}>Loading...</p>
      </div>
    );
  }

  if (!session) return <LoginPage onLogin={setSession} />;
  return <Dashboard user={session} onLogout={() => setSession(null)} />;
}
