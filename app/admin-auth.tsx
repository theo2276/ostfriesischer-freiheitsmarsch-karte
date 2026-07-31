"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

export function AdminGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "open">("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin-auth", { cache: "no-store" })
      .then(response => setStatus(response.ok ? "open" : "locked"))
      .catch(() => setStatus("locked"));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (response?.ok) {
      setPassword("");
      setStatus("open");
    } else {
      setError("Das Passwort ist nicht korrekt.");
    }
    setBusy(false);
  }

  if (status === "open") return children;

  return (
    <main className="admin-auth-screen">
      <form className="admin-auth-card" onSubmit={login}>
        <img src="/ofm-logo.png" alt="Ostfriesischer Freiheitsmarsch" />
        <span>GESCHÜTZTER BEREICH</span>
        <h1>OFM Karten-Admin</h1>
        <p>Bitte gib das Admin-Passwort ein, um Strecken zu bearbeiten.</p>
        {status === "checking" ? <div className="admin-auth-loading">Zugang wird geprüft …</div> : <>
          <label htmlFor="admin-password">Passwort</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} autoFocus />
          {error && <div className="admin-auth-error" role="alert">{error}</div>}
          <button type="submit" disabled={busy}>{busy ? "Wird geprüft …" : "Admin öffnen"}</button>
        </>}
        <a href="/ofm-karte">Zur öffentlichen Streckenkarte</a>
      </form>
    </main>
  );
}
