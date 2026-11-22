"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AuthForms() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/auth/${mode === "signin" ? "login" : "register"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "That didn't work. Check the details and try again.");
      setBusy(false);
      return;
    }
    router.replace(safeNext);
    router.refresh();
  }

  return (
    <div className="auth">
      <div className="auth-tabs" role="tablist">
        <button role="tab" type="button" aria-selected={mode === "signin"} onClick={() => { setMode("signin"); setError(null); }}>
          Sign in
        </button>
        <button role="tab" type="button" aria-selected={mode === "register"} onClick={() => { setMode("register"); setError(null); }}>
          Create an account
        </button>
        <span className="auth-ink" data-mode={mode} aria-hidden="true" />
      </div>

      <form onSubmit={submit} key={mode} className="auth-form">
        {mode === "register" && (
          <label className="field">
            <span>Your name</span>
            <input name="name" autoComplete="name" required minLength={2} />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 8 : undefined}
            required
          />
          {mode === "register" && <small>At least 8 characters.</small>}
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-quiet"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
