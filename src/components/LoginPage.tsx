"use client";
import { useState } from "react";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const S = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "#FAFAF9" } as React.CSSProperties,
  wrap: { width: "100%", maxWidth: 420 } as React.CSSProperties,
  logo: { display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 16, background: "#1C1917", margin: "0 auto 20px" } as React.CSSProperties,
  logoText: { color: "#fff", fontWeight: 700, fontSize: 22, fontFamily: "'Fraunces', serif" } as React.CSSProperties,
  title: { textAlign: "center" as const, fontSize: 26, fontWeight: 600, fontFamily: "'Fraunces', serif", marginBottom: 6, color: "#1C1917" },
  subtitle: { textAlign: "center" as const, fontSize: 14, color: "#78716C", marginBottom: 36 },
  card: { background: "#fff", borderRadius: 16, padding: "32px 28px", boxShadow: "0 8px 30px rgba(28,25,23,0.07)", border: "1px solid #F0EEEC" } as React.CSSProperties,
  label: { display: "block", fontSize: 13, fontWeight: 500, color: "#78716C", marginBottom: 6 } as React.CSSProperties,
  inputWrap: { position: "relative" as const, marginBottom: 18 },
  icon: { position: "absolute" as const, left: 12, top: "50%", transform: "translateY(-50%)", color: "#A8A29E" },
  input: { width: "100%", paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 12, fontSize: 14, background: "#FAFAF9", border: "1px solid #E7E5E4", color: "#1C1917", transition: "all 0.15s" } as React.CSSProperties,
  error: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, fontSize: 13, background: "#FEF2F2", color: "#EF4444", marginBottom: 16 } as React.CSSProperties,
  btn: { width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#fff", background: "#1C1917", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.15s" } as React.CSSProperties,
  divider: { marginTop: 24, paddingTop: 20, borderTop: "1px solid #F0EEEC" } as React.CSSProperties,
  hint: { fontSize: 11, color: "#A8A29E", textAlign: "center" as const, lineHeight: 1.6 },
};

export default function LoginPage({ onLogin }: { onLogin: (u: any) => void }) {
  const [email, setEmail] = useState("zainulabideenbaloch@proton.me");
  const [password, setPassword] = useState("Ajalpc@yo1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else if (data.user) {
      const u = {
        email: data.user.email,
        role: "owner",
        name: "Zain & Fatima"
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("devmate_auth", JSON.stringify(u));
      }
      onLogin(u);
    } else {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.logo}><span style={S.logoText}>D</span></div>
        <h1 style={S.title}>Command Center</h1>
        <p style={S.subtitle}>Devmate Solutions — Daily Operations Hub</p>

        <div style={S.card}>
          <form onSubmit={submit}>
            <label style={S.label}>Email</label>
            <div style={S.inputWrap}>
              <Mail size={16} style={S.icon} />
              <input style={S.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>

            <label style={S.label}>Password</label>
            <div style={S.inputWrap}>
              <Lock size={16} style={S.icon} />
              <input style={S.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>

            {error && <div style={S.error}><AlertCircle size={15} />{error}</div>}

            <button type="submit" style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
              {loading ? <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> : <><span>Sign In</span><ArrowRight size={15} /></>}
            </button>
          </form>

          <div style={S.divider}>
            <p style={S.hint}>
              Secure login via Supabase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
